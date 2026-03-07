'use client';

import { useState, useTransition } from 'react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { updateAccountPlan } from '../_lib/update-plan.action';

const PLANS = ['free', 'starter', 'pro', 'team', 'enterprise'] as const;
type Plan = (typeof PLANS)[number];

interface PlanManagementProps {
  accountId: string;
  currentPlan: Plan;
  currentOverrides: Record<string, number> | null;
}

export function PlanManagement({
  accountId,
  currentPlan,
  currentOverrides,
}: PlanManagementProps) {
  const [plan, setPlan] = useState<Plan>(currentPlan);
  const [overrides, setOverrides] = useState<Record<string, string>>(
    currentOverrides
      ? Object.fromEntries(
          Object.entries(currentOverrides).map(([k, v]) => [k, String(v)]),
        )
      : {},
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const handleSave = () => {
    startTransition(async () => {
      try {
        const parsedOverrides =
          Object.keys(overrides).length > 0
            ? Object.fromEntries(
                Object.entries(overrides)
                  .filter(([, v]) => v !== '')
                  .map(([k, v]) => [k, parseInt(v, 10)]),
              )
            : null;

        await updateAccountPlan({
          accountId,
          plan,
          overrides: parsedOverrides,
        });
        setMessage('Plan updated successfully');
      } catch (e) {
        setMessage(
          `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        );
      }
    });
  };

  const overrideFields = [
    { key: 'observations_per_month', label: 'Observations/month' },
    { key: 'verifications_per_month', label: 'Verifications/month' },
    { key: 'max_rpm', label: 'Max RPM' },
    { key: 'max_agents', label: 'Max Agents (-1 = unlimited)' },
    { key: 'retention_days', label: 'Retention (days)' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vex Plan Management</CardTitle>
        <CardDescription>
          Manage the organization&apos;s Vex plan and custom limit overrides.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Plan</Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {plan === 'enterprise' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Custom Overrides</Label>
            <div className="grid grid-cols-2 gap-3">
              {overrideFields.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {label}
                  </Label>
                  <Input
                    type="number"
                    placeholder="Plan default"
                    value={overrides[key] ?? ''}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Plan'}
          </Button>
          {message && (
            <span
              className={`text-sm ${
                message.startsWith('Error')
                  ? 'text-destructive'
                  : 'text-green-600'
              }`}
            >
              {message}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
