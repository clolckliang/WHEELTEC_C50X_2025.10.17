import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface MetricCardProps {
  title: string;
  description?: string;
  value: string;
  secondary?: string;
  icon?: ReactNode;
}

export function MetricCard({ title, description, value, secondary, icon }: MetricCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardDescription>{description}</CardDescription>
          <CardTitle className="mt-1">{title}</CardTitle>
        </div>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {secondary ? <p className="mt-2 text-sm text-muted-foreground">{secondary}</p> : null}
      </CardContent>
    </Card>
  );
}
