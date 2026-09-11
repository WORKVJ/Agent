import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

logger = logging.getLogger(__name__)

TRACKING_GROUP_NAME = "agent_tracking_group"


class LocationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join tracking broadcast group
        await self.channel_layer.group_add(
            TRACKING_GROUP_NAME,
            self.channel_name
        )
        await self.accept()
        logger.info(f"WebSocket client connected: {self.channel_name}")

        # Send welcome ack
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": "Connected to real-time location stream.",
            "timestamp": timezone.now().isoformat()
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            TRACKING_GROUP_NAME,
            self.channel_name
        )
        logger.info(f"WebSocket client disconnected: {self.channel_name}")

    async def receive(self, text_data):
        """
        Handle incoming messages from agent or client over WebSocket.
        """
        try:
            data = json.loads(text_data)
            event_type = data.get('type')

            if event_type == 'location_ping':
                agent_id = data.get('agent_id')
                lat = data.get('latitude')
                lng = data.get('longitude')
                speed = data.get('speed', 0.0)
                battery = data.get('battery_level', 100)

                # Broadcast to all managers in the tracking group
                await self.channel_layer.group_send(
                    TRACKING_GROUP_NAME,
                    {
                        'type': 'agent_location_broadcast',
                        'data': {
                            'event': 'location_ping',
                            'agent_id': agent_id,
                            'latitude': lat,
                            'longitude': lng,
                            'speed': speed,
                            'battery_level': battery,
                            'timestamp': timezone.now().isoformat()
                        }
                    }
                )

            elif event_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong', 'timestamp': timezone.now().isoformat()}))

        except Exception as e:
            logger.error(f"Error handling incoming WS message: {e}")
            await self.send(text_data=json.dumps({'error': str(e)}))

    async def agent_location_broadcast(self, event):
        """
        Handler for messages pushed to the tracking group.
        Sends payload down the WebSocket connection to the frontend.
        """
        await self.send(text_data=json.dumps(event['data']))


def broadcast_location_sync(event_data: dict):
    """
    Synchronous helper function to broadcast location and status events from Django REST views.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                TRACKING_GROUP_NAME,
                {
                    'type': 'agent_location_broadcast',
                    'data': event_data
                }
            )
    except Exception as exc:
        logger.warning(f"Could not broadcast WS event: {exc}")
