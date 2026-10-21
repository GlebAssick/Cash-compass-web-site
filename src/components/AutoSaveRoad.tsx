import { Card } from "@/components/ui/card";

interface AutoSaveRoadProps {
  saved: number;
  target: number;
  formatValue: (value: number) => string;
}

export const AutoSaveRoad = ({ saved, target, formatValue }: AutoSaveRoadProps) => {
  const progress = target > 0 ? Math.min(1, Math.max(0, saved / target)) : 0;
  const percent = Math.round(progress * 100);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Auto Save</h3>
          <p className="text-sm text-muted-foreground">
            {formatValue(saved)} of {formatValue(target)} weekly target
          </p>
        </div>
        <span className="text-2xl font-bold">{percent}%</span>
      </div>

      {/* Дорога */}
      <div className="relative my-8">
        {/* Линия дороги */}
        <div className="h-1 w-full rounded-full bg-zinc-300 dark:bg-zinc-700" />

        {/* Прогресс-линия */}
        <div
          className="absolute left-0 top-0 h-1 rounded-full bg-primary transition-all duration-700"
          style={{ width: `${percent}%` }}
        />

        {/* Машинка НАД линией, повёрнута влево (едет к цели) */}
        <div
          className="absolute -top-6 text-2xl transition-all duration-700"
          style={{
            left: `calc(${percent}% - 12px)`,
            transform: 'scaleX(-1)'
          }}
        >
          🚗
        </div>

        {/* Флаг ПРАВЕЕ конца линии */}
        <div className="absolute -top-5 -right-4 text-xl">🏁</div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Start</span>
        <span>Target: {formatValue(target)}</span>
      </div>
    </Card>
  );
};

export default AutoSaveRoad;