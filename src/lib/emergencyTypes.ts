import { Heart, Car, UserX, Users } from 'lucide-react';

export type EmergencyType = 'funeral' | 'accident' | 'loss_of_member' | 'loss_of_beneficiary';

export interface EmergencyTypeConfig {
  label: string;
  icon: typeof Heart;
  settingsKey: 'funeral_emergency_amount' | 'accident_emergency_amount' | 'loss_of_member_amount' | 'loss_of_beneficiary_amount';
  color: string;
  bgColor: string;
  routePrefix: string;
}

export const EMERGENCY_TYPES: Record<EmergencyType, EmergencyTypeConfig> = {
  funeral: {
    label: 'Funeral',
    icon: Heart,
    settingsKey: 'funeral_emergency_amount',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    routePrefix: 'funeral',
  },
  accident: {
    label: 'Accident',
    icon: Car,
    settingsKey: 'accident_emergency_amount',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    routePrefix: 'accident',
  },
  loss_of_member: {
    label: 'Loss of Member',
    icon: UserX,
    settingsKey: 'loss_of_member_amount',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    routePrefix: 'loss-of-member',
  },
  loss_of_beneficiary: {
    label: 'Loss of Beneficiary',
    icon: Users,
    settingsKey: 'loss_of_beneficiary_amount',
    color: 'text-info',
    bgColor: 'bg-info/10',
    routePrefix: 'loss-of-beneficiary',
  },
};

export function getEmergencyTypeLabel(type: string): string {
  return EMERGENCY_TYPES[type as EmergencyType]?.label || type;
}

export function getEmergencyTypeConfig(type: string): EmergencyTypeConfig {
  return EMERGENCY_TYPES[type as EmergencyType] || EMERGENCY_TYPES.funeral;
}
