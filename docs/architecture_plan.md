# Field Agent Tracking & Management System — System Architecture & Engineering Plan

## 1. Executive Summary & Scope
The **Field Agent Tracking & Management System (AgentPulse HQ)** is an enterprise platform delivering real-time field workforce tracking, geofenced client visit verification, dynamic watermarked selfie proofing, meeting stopwatch and gated punch-out workflows, and an admin command center with live Leaflet/Mapbox maps, route replays, and audit inspection.

---

## 2. System Architecture Overview

```
                      ┌────────────────────────────────────────────────────────┐
                      │                 Frontends & PWA Layer                  │
                      │                                                        │
                      │  [Field Agent Mobile App (PWA)]   [Admin Dashboard]    │
                      │   - Live GPS & Duty Toggle         - Live Map & Radar  │
                      │   - Compressed Canvas Watermarker  - Route Replay HUD  │
                      │   - Live Meeting Stopwatch         - Audit Modal       │
                      │   - Gated Punch-Out Form           - Fleet Analytics   │
                      │   - IndexedDB Offline Queue                            │
                      └──────────────┬───────────────────────────┬─────────────┘
                                     │ HTTP (REST API)           │ WebSockets
                                     ▼                           ▼
                      ┌────────────────────────────────────────────────────────┐
                      │                Django 5 + Channels ASGI                │
                      │                                                        │
                      │  - Server-Side Geofence Engine (50m Radius ST_DWithin) │
                      │  - Authoritative Server Clock (Time In / Time Out)     │
                      │  - Real-time Channel Layer Broadcasting                │
                      │  - Photo & Attachment Ingestion                        │
                      └──────────────┬───────────────────────────┬─────────────┘
                                     │                           │
                                     ▼                           ▼
                      ┌───────────────────────────────┐ ┌──────────────────────┐
                      │ PostGIS / Spatial DB Engine   │ │ Redis Pub/Sub Broker │
                      │ (AgentProfile, ClientLocation,│ │ (WebSocket Group     │
                      │  VisitLog, TrackingLog)       │ │  Location Streaming) │
                      └───────────────────────────────┘ └──────────────────────┘
```

---

## 3. Database Schema & PostGIS Spatial Models

### 3.1 Model Definitions (`backend/tracking/models.py`)

#### 1. `AgentProfile`
```python
class AgentProfile(models.Model):
    STATUS_OFF_DUTY = 'OFF_DUTY'
    STATUS_IDLE = 'IDLE'
    STATUS_MOVING = 'MOVING'
    STATUS_CHECKED_IN = 'CHECKED_IN'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_profile')
    employee_id = models.CharField(max_length=50, unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_on_duty = models.BooleanField(default=False)
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OFF_DUTY)
    battery_level = models.IntegerField(default=100)
    last_latitude = models.FloatField(null=True, blank=True)
    last_longitude = models.FloatField(null=True, blank=True)
    last_speed = models.FloatField(default=0.0)  # km/h
    last_seen_at = models.DateTimeField(null=True, blank=True)
    # PostGIS spatial point for production PostgreSQL+PostGIS:
    # location = models.PointField(srid=4326, null=True, blank=True)
```

#### 2. `ClientLocation`
```python
class ClientLocation(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    contact_person = models.CharField(max_length=150, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    geofence_radius_meters = models.FloatField(default=50.0)
    created_at = models.DateTimeField(auto_now_add=True)
    # PostGIS spatial point:
    # point = models.PointField(srid=4326)
```

#### 3. `LocationTrackingLog`
```python
class LocationTrackingLog(models.Model):
    agent = models.ForeignKey(AgentProfile, on_delete=models.CASCADE, related_name='location_logs')
    latitude = models.FloatField()
    longitude = models.FloatField()
    speed = models.FloatField(default=0.0)
    battery_level = models.IntegerField(default=100)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']
        indexes = [models.Index(fields=['agent', 'timestamp'])]
```

#### 4. `VisitLog` (With Server-Side Timestamps & Selfie Storage)
```python
class VisitLog(models.Model):
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CANCELLED = 'CANCELLED'

    agent = models.ForeignKey(AgentProfile, on_delete=models.CASCADE, related_name='visits')
    client = models.ForeignKey(ClientLocation, on_delete=models.CASCADE, related_name='visits')
    # Server-side timestamps (Single source of truth)
    check_in_time = models.DateTimeField(default=timezone.now)
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_latitude = models.FloatField()
    check_in_longitude = models.FloatField()
    distance_at_checkin = models.FloatField(help_text="Calculated distance in meters at punch-in")
    meeting_notes = models.TextField(blank=True)
    order_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    follow_up_date = models.DateField(null=True, blank=True)
    selfie_image = models.TextField(blank=True, default='', help_text="Base64 or URL of watermarked selfie")
    attachment_image = models.TextField(blank=True, default='', help_text="Base64 or URL of meeting proof")
    photo = models.ImageField(upload_to='visit_photos/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS)

    @property
    def duration_minutes(self):
        if self.check_in_time and self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            return round(delta.total_seconds() / 60.0, 1)
        return None
```

---

## 4. API Endpoints & Server-Side Geofence Flow

### 4.1 Server-Side Timestamping & 50m Geofence (`POST /api/check-in/`)
1. **Input Payload**: `{ agent_id: int, client_id: int, latitude: float, longitude: float, selfie_image: string }`.
2. **Duty Check**: Verifies `agent.is_on_duty == True`. If false, rejects with 400.
3. **Overlapping Visit Check**: Rejects if active visit is already ongoing.
4. **Geofence Calculation**:
   - Computes exact geodetic distance between agent coords and client coords using WGS-84 geodesic ellipsoid metric (`ST_DWithin(agent_geom::geography, client_geom::geography, 50)`).
   - If distance $> 50.0\text{ meters}$, rejects with HTTP 400 and exact distance discrepancy.
5. **Server Clock Timestamp**: Sets `check_in_time = timezone.now()` (authoritative server clock, discarding any client device timestamp overrides).
6. **Persistence**: Saves `VisitLog` and sets `agent.current_status = 'CHECKED_IN'`.
7. **Broadcast**: Triggers WebSocket broadcast to `agent_tracking_group`.

### 4.2 Gated Punch-Out (`POST /api/check-out/`)
1. **Input Payload**: `{ visit_id: int, meeting_notes: string, order_value: float, follow_up_date?: string, attachment_image?: string }`.
2. **Validation**: Rejects if `meeting_notes` is empty.
3. **Server Clock Timestamp**: Sets `check_out_time = timezone.now()`.
4. **Duration Calculation**: Derives `duration_minutes = (check_out_time - check_in_time)`.
5. **Persistence**: Sets `status = 'COMPLETED'`, resets agent status to `'IDLE'`.
6. **Broadcast**: Streams visit completion event to managers.

---

## 5. Client Canvas Watermarking & Memory Optimization

To prevent mobile web browser memory spikes when processing high-resolution (12MP–48MP) camera photos:
1. **Pre-Compression Resize**:
   - The raw image is downsampled into a normalized rendering canvas (max width/height: 800px) before watermarking.
2. **Watermark Layer Composition**:
   - A high-contrast dark gradient banner (alpha 0.85) is drawn at the base of the canvas.
   - Stamped metadata:
     - Timestamp: Formatted server/local time.
     - Coordinates: `Latitude, Longitude` to 5 decimal places (~1m precision).
     - Proximity Proof: `GEOFENCE VERIFIED (<50M)`.
     - Client Name & Agent Identification.
3. **Export Compression**:
   - Canvas exported as JPEG with quality `0.85`, producing an optimized ~90KB–150KB payload.

---

## 6. Offline Storage Engine (IndexedDB)

Replaces naive local storage with a robust IndexedDB queue:
- **Object Store**: `offline_queue`
- **Actions Enqueued**:
  - `LOCATION_PING`: Periodic breadcrumbs.
  - `SELFIE_CHECK_IN`: Geofenced punch-in with watermarked photo.
  - `VISIT_CHECK_OUT`: Discussion notes and attachments.
- **Auto-Sync Listener**: Listens to `window.addEventListener('online', syncQueue)` and flushes pending items sequentially with retry backoff.

---

## 7. Next.js Admin Command Center Features
1. **Live Operational Fleet Map**: Leaflet.js with clean OpenStreetMap tiles, dynamic marker clustering, battery reserve gauges, and translucent 50m client geofences.
2. **Audit Modal**: Click any visit log in the audit trail to inspect the watermarked selfie proof, discussion notes, punch in/out timestamps, and attached documents.
3. **Route Replay**: Timeline player with scrub bar, speed multipliers (1x–10x), and vehicle telemetry HUD.
4. **Performance Analytics**: Real-time transit vs meeting time breakdown, conversion rate, and fleet distance.
