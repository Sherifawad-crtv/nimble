type Tone = 'blue' | 'pink' | 'brand' | 'green';
type Kind = 'assignment' | 'link' | 'package' | 'wearable';
type Measured = 'reps' | 'weight_reps' | 'time' | 'distance' | 'rounds';
type BlockType = 'standard' | 'amrap' | 'emom' | 'for_time' | 'tabata' | 'custom';
export interface IconProps { name: string; size?: number; color?: string }
export interface ButtonProps { children?: React.ReactNode; variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive'; size?: 'lg' | 'md' | 'sm'; icon?: string; iconOnly?: boolean; label?: string; loading?: boolean; disabled?: boolean; fullWidth?: boolean; onClick?: () => void }
export interface IconButtonProps { icon: string; label: string; variant?: 'control' | 'ghost' | 'action'; size?: number; disabled?: boolean; onClick?: () => void }
export interface PillNavProps { items: { id: string; icon: string; label: string; badge?: boolean }[]; active: string; onChange?: (id: string) => void; action?: { icon: string; label: string; onClick?: () => void } }
export interface SidebarProps { workspace: string; items: { id: string; icon: string; label: string }[]; active: string; onChange?: (id: string) => void; user?: { name: string; role: string } }
export interface TopBarProps { variant?: 'large' | 'compact' | 'back' | 'desktop'; title?: string; eyebrow?: string; trailing?: React.ReactNode; onBack?: () => void }
export interface TextFieldProps { label?: string; required?: boolean; placeholder?: string; value?: string; defaultValue?: string; onChange?: (e: any) => void; icon?: string; trailing?: React.ReactNode; hint?: string; error?: string; success?: string; multiline?: boolean; disabled?: boolean; type?: string }
export interface SearchFieldProps { placeholder?: string; value?: string; onChange?: (v: string) => void; results?: { label: string; meta?: string; icon?: string }[] }
export interface NumberFieldProps { label?: string; value?: number; defaultValue?: number; min?: number; max?: number; step?: number; unit?: string; large?: boolean; onChange?: (n: number) => void }
export interface DateFieldProps { label?: string; value?: string; onChange?: (e: any) => void; required?: boolean; error?: string; locale?: string }
export interface SegmentedProps { options: { id: string; label: string }[]; value: string; onChange?: (id: string) => void }
export interface UnderlineTabsProps { tabs: { id: string; label: string }[]; value: string; onChange?: (id: string) => void }
export interface CheckboxProps { label: string; description?: string; checked?: boolean; defaultChecked?: boolean; onChange?: (v: boolean) => void; disabled?: boolean; name?: string }
export interface ChipProps { label?: string; selected?: boolean; onClick?: () => void; onRemove?: () => void; add?: boolean }
export interface TagInputProps { label?: string; tags?: string[]; suggestions?: string[]; query?: string; open?: boolean }
export interface SelectProps { label?: string; options: { id: string; label: string }[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; placeholder?: string; defaultOpen?: boolean; disabled?: boolean }
export interface CardProps { title?: string; meta?: string; thumb?: boolean; tappable?: boolean; onClick?: () => void; children?: React.ReactNode }
export interface ListRowProps { title: string; subtitle?: string; leading?: 'avatar' | 'thumb' | React.ReactNode; trailing?: React.ReactNode; chevron?: boolean; onClick?: () => void; swipe?: { label: string; icon: string; tone?: 'danger'; onClick?: () => void }[]; swiped?: boolean; drag?: boolean; dragging?: boolean }
export interface DataTableProps { columns: { key: string; label: string; sortable?: boolean; align?: 'start' | 'end' | 'center'; width?: number | string; render?: (row: any) => React.ReactNode }[]; rows: any[]; sortKey?: string; sortDir?: 'asc' | 'desc'; onSort?: (key: string) => void; selectedId?: string | number; onRowClick?: (id: any) => void; rowActions?: boolean; loading?: boolean; emptyText?: string }
export interface BottomSheetProps { title?: string; children?: React.ReactNode; footer?: React.ReactNode; height?: 'half' | 'full'; onClose?: () => void; overlay?: boolean }
export interface DialogProps { title: string; children?: React.ReactNode; actions?: React.ReactNode; tone?: 'destructive'; overlay?: boolean }
export interface ToastProps { tone?: 'success' | 'error' | 'info'; message: string; action?: string; onAction?: () => void }
export interface BannerProps { kind?: 'offline' | 'update' | 'install' | 'video' | 'error'; title?: string; message: string; action?: string; onAction?: () => void; onDismiss?: () => void }
export interface StatusChipProps { kind: Kind; value: string; label?: string }
export interface AvatarProps { name: string; src?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; dot?: 'connected' | 'disconnected' | 'error' }
export interface EmptyStateProps { icon?: string; title: string; body?: string; action?: string; onAction?: () => void }
export interface SkeletonProps { variant?: 'list' | 'card' | 'chart' | 'detail'; rows?: number }
export interface ErrorStateProps { title?: string; body?: string; icon?: string; inline?: boolean; onRetry?: () => void }
export interface VideoPreviewProps { state?: 'ready' | 'loading' | 'playing' | 'unavailable' | 'blocked'; size?: 'compact' | 'full'; provider?: 'YouTube' | 'Vimeo'; title?: string }
export interface ExerciseRowProps { name: string; tags?: string[]; measuredAs?: Measured; link?: 'ok' | 'unavailable' | 'unchecked'; variant?: 'library' | 'add' | 'block'; target?: string; selected?: boolean; drag?: boolean; log?: React.ReactNode }
export interface BlockHeaderProps { title: string; type: BlockType; settings?: any; summary?: string }
export interface BlockSettingsProps { type: BlockType; value?: any; onChange?: (v: any) => void }
export interface TargetEditorProps { blockType?: BlockType; measuredAs?: Measured }
export interface LogInputProps { measuredAs?: Measured; sets?: { v: string[]; done: boolean }[]; target?: string[] }
export interface CalendarProps { mode?: 'week' | 'month'; data?: Record<string, string[]>; selected?: string; onSelect?: (iso: string) => void; month?: string; today?: string; weekStart?: number; locale?: string; agenda?: { title: string; subtitle?: string; status: string }[] }
export interface TimerDisplayProps { time: string; phase?: string; sub?: string; progress?: number; tone?: 'work' | 'rest' | 'ready'; final?: boolean; paused?: boolean; variant?: 'ring' | 'bar'; size?: 'md' | 'xl' }
export interface RoundCounterProps { count?: number; onChange?: (n: number) => void; extra?: boolean }
export interface RestTimerProps { remaining?: number; total?: number; next?: string; onAdd?: () => void; onSub?: () => void; onSkip?: () => void }
export interface TimerControlsProps { state?: 'ready' | 'running' | 'paused' | 'finished'; sound?: boolean; voice?: boolean; keepAwake?: 'on' | 'unavailable'; onStart?: () => void; onPause?: () => void; onResume?: () => void; onStop?: () => void; onFinish?: () => void; onSound?: () => void; onVoice?: () => void }
export interface MetricTileProps { kind: 'sleep' | 'rhr' | 'hrv' | 'strain' | 'calories' | 'avg_hr' | 'max_hr' | 'live_hr'; value?: string | number | null; unit?: string; brand?: string; label?: string }
export interface BrandChipProps { brand: string }
export interface ReadinessIndicatorProps { level: 'low' | 'ok' | 'high'; basedOn?: string[]; brand?: string }
export interface CapabilityListProps { items: string[] }
export interface CommentThreadProps { comments: { author: string; role: 'coach' | 'client'; time: string; text: string; failed?: boolean }[]; viewer?: 'coach' | 'client'; onSend?: (text: string) => void; sending?: boolean }
export interface PackageCardProps { name?: string; used?: number; total?: number; expires?: string; paid?: boolean; state?: 'active' | 'expiring' | 'expired' | 'none' }
export interface PersonalRecordProps { exercise: string; label: string; date: string; isNew?: boolean }
export interface ProgressChartProps { title: string; points: { x: string; y: number }[]; unit?: string; showTable?: boolean }
export interface StepperProps { steps: string[]; current: number }
export interface OverflowMenuProps { items: { icon: string; label: string; tone?: 'danger'; onClick?: () => void }[]; as?: 'popover' | 'sheet'; title?: string }
export interface TooltipProps { text: string; placement?: 'top' | 'bottom'; open?: boolean; children?: React.ReactNode }
export interface ReorderListProps { items: { id: string; label: string }[]; onChange?: (items: any[]) => void; dragging?: string; dropAfter?: string }
export interface SplashProps { src?: string }
export interface HeadlineProps { children: React.ReactNode; accent?: string; center?: boolean; subtitle?: string }
export interface MetricPillProps { tone?: 'blue' | 'pink' | 'brand'; icon: string; value: string; unit?: string; label: string }
export interface StatCardProps { tone?: Tone; icon: string; value: string; label: string }
export interface DotGridProps { total?: number; done?: number; columns?: number }
export interface TabBarProps { items: { id: string; icon: string; label: string }[]; active: string; onChange?: (id: string) => void }
export interface GoalDialProps { label: string; unit: string; value: number; min?: number; max?: number; step?: number; onChange?: (value: number) => void }
export interface RouteCardProps { time: string; distance: string; progress?: number }
export interface WordmarkProps { tone?: 'brand-on-black' | 'black-on-brand' | 'white-on-black'; size?: number }
export interface EmblemProps { tone?: 'brand-on-black' | 'black-on-brand' | 'white-on-black'; size?: number; src?: string; mode?: 'luminance' | 'alpha'; bg?: boolean }
export interface LockupProps { tone?: 'brand-on-black' | 'black-on-brand' | 'white-on-black'; size?: number; src?: string; bg?: boolean }
export interface AppIconProps { size?: number; src?: string; masked?: boolean }
