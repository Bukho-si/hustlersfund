import { useParams } from 'react-router-dom';
import EmergencyEventDetail from '@/components/emergency/EmergencyEventDetail';

export default function AdminEmergencyEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  if (!eventId) return null;
  return <EmergencyEventDetail eventId={eventId} />;
}
