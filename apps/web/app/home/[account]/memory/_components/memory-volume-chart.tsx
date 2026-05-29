'use client';

import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@kit/ui/chart';
import { Trans } from '@kit/ui/trans';

import type { MemoryVolumePoint } from '../_lib/server/memory.loader';

interface MemoryVolumeChartProps {
  volume: MemoryVolumePoint[];
}

const CAPTURED_COLOR = '#34C78E';
const RECALLED_COLOR = '#60A5FA';

function formatDay(day: string): string {
  const date = new Date(day);

  if (Number.isNaN(date.getTime())) {
    return day;
  }

  return format(date, 'MMM d');
}

export function MemoryVolumeChart({ volume }: MemoryVolumeChartProps) {
  const { t } = useTranslation('agentguard');

  const chartData = volume.map((point) => ({
    day: formatDay(point.day),
    captured: point.captured,
    recalled: point.recalled,
  }));

  const chartConfig = {
    captured: {
      label: t('memory.captured'),
      color: CAPTURED_COLOR,
    },
    recalled: {
      label: t('memory.recalled'),
      color: RECALLED_COLOR,
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:memory.volumeTitle" />
        </CardTitle>
        <CardDescription>
          <Trans i18nKey="agentguard:memory.volumeDescription" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            <Trans i18nKey="agentguard:memory.volumeEmpty" />
          </p>
        ) : (
          <ChartContainer className="h-64 w-full" config={chartConfig}>
            <AreaChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                width={36}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="captured"
                stroke={CAPTURED_COLOR}
                fill={CAPTURED_COLOR}
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="recalled"
                stroke={RECALLED_COLOR}
                fill={RECALLED_COLOR}
                fillOpacity={0.4}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
