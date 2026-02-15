import * as Icons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
}

export function DynamicIcon({ name, className }: DynamicIconProps) {
  // 获取图标组件，如果不存在则使用默认的 Grid3X3
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // 默认图标
  return <Icons.Grid3X3 className={className} />;
}
