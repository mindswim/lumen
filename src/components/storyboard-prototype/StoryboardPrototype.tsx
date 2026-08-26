'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  AudioLines,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Copy,
  Film,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  List,
  MapPin,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Upload,
  UsersRound,
  WandSparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type WorkspaceSection = 'storyboards' | 'references';
type StoryboardView = 'board' | 'shot-list' | 'timing';
type ReferenceCategory = 'character' | 'location' | 'look';

interface PrototypeScene {
  id: string;
  number: number;
  title: string;
  location: string;
  time: string;
}

interface PrototypeShot {
  id: string;
  sceneId: string;
  number: number;
  title: string;
  beat: string;
  image: string;
  size: string;
  angle: string;
  movement: string;
  duration: number;
  referenceIds: string[];
}

interface PrototypeReference {
  id: string;
  name: string;
  category: ReferenceCategory;
  image: string;
  description: string;
  origin: string;
  usedBy: number[];
}

const scenes: PrototypeScene[] = [
  {
    id: 'scene-1',
    number: 1,
    title: 'Two badges',
    location: 'Metropolitan Police headquarters, White Street',
    time: 'Late morning',
  },
  {
    id: 'scene-2',
    number: 2,
    title: 'City Hall Park',
    location: 'Rear steps of New York City Hall',
    time: '3:30 p.m.',
  },
  {
    id: 'scene-3',
    number: 3,
    title: 'The state arrives',
    location: 'City Hall interior and park',
    time: 'Late afternoon',
  },
];

const shots: PrototypeShot[] = [
  {
    id: 'shot-1',
    sceneId: 'scene-1',
    number: 1,
    title: 'New badge',
    beat: 'Elias pins on his new Metropolitan badge while keeping his old Municipal star in his pocket.',
    image: '/generated/great-police-riot/shot-01-new-badge.png',
    size: 'Extreme close-up',
    angle: 'Eye level',
    movement: 'Static',
    duration: 2.5,
    referenceIds: ['elias'],
  },
  {
    id: 'shot-2',
    sceneId: 'scene-1',
    number: 2,
    title: 'The warrant',
    beat: 'The arrest warrants for Mayor Fernando Wood are read to the assembled Metropolitan officers.',
    image: '/generated/great-police-riot/shot-02-the-warrant.png',
    size: 'Medium',
    angle: 'Eye level',
    movement: 'Static',
    duration: 3.5,
    referenceIds: ['elias'],
  },
  {
    id: 'shot-3',
    sceneId: 'scene-1',
    number: 3,
    title: 'Fifty men',
    beat: 'Fifty Metropolitans march two abreast from White Street toward City Hall.',
    image: '/generated/great-police-riot/shot-03-fifty-men.png',
    size: 'Extreme wide',
    angle: 'Eye level',
    movement: 'Tracking',
    duration: 4,
    referenceIds: ['elias', 'city-hall'],
  },
  {
    id: 'shot-4',
    sceneId: 'scene-2',
    number: 4,
    title: 'Locked doors',
    beat: 'Samuel stations Municipal officers inside City Hall and bars the rear entrance.',
    image: '/generated/great-police-riot/shot-04-locked-doors.png',
    size: 'Wide',
    angle: 'Low angle',
    movement: 'Static',
    duration: 3.5,
    referenceIds: ['samuel', 'city-hall'],
  },
  {
    id: 'shot-5',
    sceneId: 'scene-2',
    number: 5,
    title: 'Twenty steps',
    beat: 'The Metropolitan column climbs the rear steps and meets the Municipal line at the doors.',
    image: '/generated/great-police-riot/shot-05-twenty-steps.png',
    size: 'Medium wide',
    angle: 'Eye level',
    movement: 'Dolly in',
    duration: 4,
    referenceIds: ['elias', 'samuel', 'city-hall'],
  },
  {
    id: 'shot-6',
    sceneId: 'scene-2',
    number: 6,
    title: 'First blow',
    beat: 'A shove becomes a club fight, and Elias recognizes Samuel on the opposing line.',
    image: '/generated/great-police-riot/shot-06-first-blow.png',
    size: 'Medium close-up',
    angle: 'Eye level',
    movement: 'Handheld',
    duration: 3,
    referenceIds: ['elias', 'samuel', 'city-hall'],
  },
  {
    id: 'shot-7',
    sceneId: 'scene-3',
    number: 7,
    title: "Recorder's room",
    beat: 'Wounded Metropolitans are carried inside while the Municipal force celebrates downstairs.',
    image: '/generated/great-police-riot/shot-07-recorders-room.png',
    size: 'Medium',
    angle: 'High angle',
    movement: 'Handheld',
    duration: 3.5,
    referenceIds: ['elias', 'samuel'],
  },
  {
    id: 'shot-8',
    sceneId: 'scene-3',
    number: 8,
    title: 'The Seventh arrives',
    beat: 'The Seventh Regiment surrounds City Hall and both police forces stop fighting.',
    image: '/generated/great-police-riot/shot-08-seventh-arrives.png',
    size: 'Extreme wide',
    angle: 'High angle',
    movement: 'Static',
    duration: 4.5,
    referenceIds: ['city-hall'],
  },
  {
    id: 'shot-9',
    sceneId: 'scene-3',
    number: 9,
    title: 'Wood submits',
    beat: 'Mayor Wood accepts arrest as Elias and Samuel lower their clubs on opposite sides of the stair.',
    image: '/generated/great-police-riot/shot-09-wood-submits.png',
    size: 'Wide',
    angle: 'Eye level',
    movement: 'Static',
    duration: 5,
    referenceIds: ['elias', 'samuel', 'city-hall'],
  },
];

const references: PrototypeReference[] = [
  {
    id: 'elias',
    name: 'Elias Quinn',
    category: 'character',
    image: '/generated/great-police-riot/ref-elias-quinn.png',
    description: 'Newly sworn Metropolitan officer. Lean face, dark wavy hair, black frock coat, restrained bearing.',
    origin: 'Generated in Lumen',
    usedBy: [1, 2, 3, 5, 6, 7, 9],
  },
  {
    id: 'samuel',
    name: 'Samuel Vale',
    category: 'character',
    image: '/generated/great-police-riot/ref-samuel-vale.png',
    description: 'Veteran Municipal officer. Broader build, receding hair, weathered face, black wool uniform.',
    origin: 'Generated in Lumen',
    usedBy: [4, 5, 6, 7, 9],
  },
  {
    id: 'city-hall',
    name: 'City Hall rear entrance',
    category: 'location',
    image: '/generated/great-police-riot/ref-city-hall.png',
    description: 'Pale stone rear elevation, broad steps, mature trees, ironwork, and dusty summer light.',
    origin: 'Generated in Lumen',
    usedBy: [3, 4, 5, 6, 8, 9],
  },
];

const totalDuration = shots.reduce((total, shot) => total + shot.duration, 0);

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

function SectionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'relative flex h-14 items-center px-3 text-[13px] font-medium transition-colors',
        active ? 'text-neutral-950' : 'text-neutral-500 hover:text-neutral-800',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
      {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neutral-950" />}
    </button>
  );
}

function ViewTabs({ view, onChange }: { view: StoryboardView; onChange: (view: StoryboardView) => void }) {
  const items: { id: StoryboardView; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'board', label: 'Board', icon: LayoutGrid },
    { id: 'shot-list', label: 'Shot list', icon: List },
    { id: 'timing', label: 'Timing', icon: Film },
  ];

  return (
    <div className="flex items-center rounded-lg bg-neutral-100 p-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all sm:px-3',
              view === item.id
                ? 'bg-white text-neutral-950 shadow-sm ring-1 ring-black/5'
                : 'text-neutral-500 hover:text-neutral-900',
            )}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StoryboardOutline({
  selectedShotId,
  onSelectShot,
}: {
  selectedShotId: string;
  onSelectShot: (shotId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'scene-1': true,
    'scene-2': true,
    'scene-3': true,
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b px-4 py-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Outline</p>
          <button className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" type="button">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        <p className="truncate text-sm font-semibold text-neutral-900">Great Police Riot</p>
        <p className="mt-0.5 text-xs text-neutral-500">3 scenes · 9 shots · {formatSeconds(totalDuration)}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {scenes.map((scene) => {
          const sceneShots = shots.filter((shot) => shot.sceneId === scene.id);
          const isOpen = expanded[scene.id];
          return (
            <div className="mb-2" key={scene.id}>
              <button
                className="group flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left hover:bg-neutral-50"
                onClick={() => setExpanded((current) => ({ ...current, [scene.id]: !current[scene.id] }))}
                type="button"
              >
                {isOpen ? <ChevronDown className="size-3.5 text-neutral-400" /> : <ChevronRight className="size-3.5 text-neutral-400" />}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-neutral-800">{scene.number}. {scene.title}</span>
                <span className="text-[11px] tabular-nums text-neutral-400">{sceneShots.length}</span>
              </button>
              {isOpen && (
                <div className="ml-2 border-l pl-2">
                  {sceneShots.map((shot) => (
                    <button
                      className={cn(
                        'my-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        shot.id === selectedShotId
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950',
                      )}
                      key={shot.id}
                      onClick={() => onSelectShot(shot.id)}
                      type="button"
                    >
                      <span className={cn('w-5 text-[10px] tabular-nums', shot.id === selectedShotId ? 'text-neutral-400' : 'text-neutral-400')}>
                        {String(shot.number).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">{shot.title}</span>
                      <span className={cn('text-[10px] tabular-nums', shot.id === selectedShotId ? 'text-neutral-400' : 'text-neutral-400')}>
                        {shot.duration}s
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t p-2">
        <Button className="w-full justify-start text-neutral-600" size="sm" variant="ghost">
          <Plus className="size-4" />
          Add scene
        </Button>
      </div>
    </div>
  );
}

function ShotCard({
  shot,
  selected,
  onSelect,
}: {
  shot: PrototypeShot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        'group overflow-hidden rounded-xl bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 transition-all',
        selected
          ? 'ring-2 ring-neutral-900 ring-offset-2 ring-offset-[#f5f4f1]'
          : 'ring-black/8 hover:-translate-y-0.5 hover:shadow-md hover:ring-black/15',
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
        <Image
          alt={`${shot.title} storyboard panel`}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          fill
          sizes="(max-width: 900px) 100vw, (max-width: 1500px) 50vw, 33vw"
          src={shot.image}
        />
        <div className="absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-sm">
          {String(shot.number).padStart(2, '0')}
        </div>
        {selected && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-neutral-900 shadow-sm backdrop-blur-sm">
            <Check className="size-3" /> Selected
          </div>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-950">{shot.title}</h3>
          <span className="shrink-0 text-[11px] text-neutral-400">1 version</span>
        </div>
        <p className="mt-1.5 line-clamp-2 min-h-9 text-xs leading-[1.45] text-neutral-500">{shot.beat}</p>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400">
          <span>{shot.size}</span>
          <span>·</span>
          {shot.movement !== 'Static' && <><span>{shot.movement}</span><span>·</span></>}
          <span>{shot.duration}s</span>
        </div>
      </div>
    </button>
  );
}

function BoardView({ selectedShotId, onSelectShot }: { selectedShotId: string; onSelectShot: (id: string) => void }) {
  return (
    <div className="min-h-full bg-[#f5f4f1] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">Storyboard</p>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-2xl">The Great Police Riot — 1857</h1>
            <p className="mt-1 text-xs text-neutral-500">3 scenes · 9 shots · {formatSeconds(totalDuration)}</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button size="sm" variant="outline"><SlidersHorizontal className="size-3.5" /> View</Button>
            <Button size="sm" variant="outline"><Plus className="size-3.5" /> Shot</Button>
          </div>
        </div>

        {scenes.map((scene) => {
          const sceneShots = shots.filter((shot) => shot.sceneId === scene.id);
          return (
            <section className="mb-10" key={scene.id}>
              <div className="mb-3 flex items-center justify-between border-b border-black/8 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-neutral-400">SCENE {String(scene.number).padStart(2, '0')}</span>
                    <h2 className="truncate text-sm font-semibold text-neutral-900">{scene.title}</h2>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-neutral-500">{scene.location} · {scene.time}</p>
                </div>
                <button className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-white hover:text-neutral-900" type="button">
                  <Plus className="mr-1 inline size-3.5" /> Add shot
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 min-[680px]:grid-cols-2 min-[1500px]:grid-cols-3">
                {sceneShots.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    onSelect={() => onSelectShot(shot.id)}
                    selected={selectedShotId === shot.id}
                    shot={shot}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ShotListView({ selectedShotId, onSelectShot }: { selectedShotId: string; onSelectShot: (id: string) => void }) {
  return (
    <div className="min-h-full bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">Production view</p>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950">Shot list</h1>
            <p className="mt-1 text-xs text-neutral-500">Structured direction for the same 9 storyboard shots.</p>
          </div>
          <Button size="sm" variant="outline"><Settings2 className="size-3.5" /> Columns</Button>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead className="bg-neutral-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                <tr>
                  <th className="w-14 px-4 py-3">Shot</th>
                  <th className="w-40 px-3 py-3">Name</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="w-36 px-3 py-3">Framing</th>
                  <th className="w-28 px-3 py-3">Movement</th>
                  <th className="w-20 px-3 py-3">Duration</th>
                  <th className="w-28 px-3 py-3">Panel</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shots.map((shot) => (
                  <tr
                    className={cn('cursor-pointer text-xs transition-colors hover:bg-neutral-50', selectedShotId === shot.id && 'bg-neutral-50')}
                    key={shot.id}
                    onClick={() => onSelectShot(shot.id)}
                  >
                    <td className="px-4 py-3 font-mono text-neutral-500">{String(shot.number).padStart(2, '0')}</td>
                    <td className="px-3 py-3 font-semibold text-neutral-900">{shot.title}</td>
                    <td className="max-w-[420px] px-3 py-3 leading-5 text-neutral-600">{shot.beat}</td>
                    <td className="px-3 py-3 text-neutral-600">{shot.size}</td>
                    <td className="px-3 py-3 text-neutral-600">{shot.movement}</td>
                    <td className="px-3 py-3 tabular-nums text-neutral-600">{shot.duration}s</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-neutral-600"><CircleCheck className="size-3.5" /> Selected</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimingView({
  selectedShot,
  onSelectShot,
}: {
  selectedShot: PrototypeShot;
  onSelectShot: (id: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const elapsed = shots.slice(0, Math.max(0, shots.findIndex((shot) => shot.id === selectedShot.id))).reduce((total, shot) => total + shot.duration, 0);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const index = shots.findIndex((shot) => shot.id === selectedShot.id);
      onSelectShot(shots[(index + 1) % shots.length].id);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [onSelectShot, playing, selectedShot.id]);

  return (
    <div className="flex min-h-full flex-col bg-[#1c1c1c] text-white">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        <div className="relative aspect-[4/3] max-h-full w-full max-w-4xl overflow-hidden rounded-lg bg-black shadow-2xl">
          <Image alt={`${selectedShot.title} animatic frame`} className="object-contain" fill priority sizes="80vw" src={selectedShot.image} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-14">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] text-white/55">SHOT {String(selectedShot.number).padStart(2, '0')}</p>
                <p className="mt-1 text-sm font-semibold">{selectedShot.title}</p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-white/65">{selectedShot.beat}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-white/70">{selectedShot.duration}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#161616]">
        <div className="flex h-12 items-center gap-3 border-b border-white/10 px-4">
          <button
            aria-label={playing ? 'Pause animatic' : 'Play animatic'}
            className="flex size-8 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200"
            onClick={() => setPlaying((current) => !current)}
            type="button"
          >
            {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
          </button>
          <span className="w-28 font-mono text-[11px] text-white/55">{formatSeconds(elapsed)} / {formatSeconds(totalDuration)}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${(elapsed / totalDuration) * 100}%` }} />
          </div>
          <Button className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white" size="sm" variant="outline">
            <AudioLines className="size-3.5" /> <span className="hidden sm:inline">Add audio</span>
          </Button>
        </div>
        <div className="overflow-x-auto p-3">
          <div className="flex min-w-[920px] gap-1">
            {shots.map((shot) => (
              <button
                className={cn(
                  'group relative h-20 min-w-[76px] overflow-hidden rounded-md border transition-colors',
                  shot.id === selectedShot.id ? 'border-white' : 'border-white/10 hover:border-white/35',
                )}
                key={shot.id}
                onClick={() => onSelectShot(shot.id)}
                style={{ flex: shot.duration }}
                type="button"
              >
                <Image alt="" className="object-cover opacity-75 group-hover:opacity-100" fill sizes="180px" src={shot.image} />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px]">{String(shot.number).padStart(2, '0')}</span>
                <span className="absolute inset-x-0 bottom-0 bg-black/75 px-1.5 py-1 text-left text-[9px] text-white/75">{shot.duration}s</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferenceThumb({ reference }: { reference: PrototypeReference }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-neutral-100 ring-1 ring-black/10">
      <Image alt="" className="object-cover" fill sizes="40px" src={reference.image} />
    </div>
  );
}

function ShotInspector({ shot, onGenerate }: { shot: PrototypeShot; onGenerate: () => void }) {
  const scene = scenes.find((candidate) => candidate.id === shot.sceneId)!;
  const assignedReferences = references.filter((reference) => shot.referenceIds.includes(reference.id));

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-start justify-between border-b px-4 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-neutral-400">SHOT {String(shot.number).padStart(2, '0')} · SCENE {String(scene.number).padStart(2, '0')}</p>
          <h2 className="mt-1 truncate text-base font-semibold text-neutral-950">{shot.title}</h2>
        </div>
        <button aria-label="Shot actions" className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800" type="button">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
            <Image alt={`${shot.title} selected panel`} className="object-cover" fill sizes="330px" src={shot.image} />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-white/95 px-2 py-1 text-[10px] font-semibold text-neutral-800 shadow-sm">
              <Check className="size-3" /> Selected version
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline"><ImageIcon className="size-3.5" /> Edit selected</Button>
            <Button onClick={onGenerate} size="sm"><Sparkles className="size-3.5" /> Alternative</Button>
          </div>
        </div>

        <InspectorSection title="Direction">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Action / beat</span>
            <textarea className="min-h-20 w-full resize-none rounded-md border bg-white px-3 py-2 text-xs leading-5 text-neutral-700 outline-none focus:border-neutral-400" defaultValue={shot.beat} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Shot size" value={shot.size} />
            <CompactField label="Angle" value={shot.angle} />
          </div>
          <CompactField label="Movement" value={shot.movement} />
        </InspectorSection>

        <InspectorSection title="References" trailing={<button className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900" type="button">Manage</button>}>
          {assignedReferences.map((reference) => (
            <div className="flex items-center gap-2.5" key={reference.id}>
              <ReferenceThumb reference={reference} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-neutral-800">{reference.name}</p>
                <p className="mt-0.5 text-[10px] capitalize text-neutral-400">{reference.category === 'character' ? 'Subject identity' : 'Environment'} · Scene default</p>
              </div>
              <CircleCheck className="size-3.5 text-neutral-400" />
            </div>
          ))}
          <button className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-900" type="button">
            <Plus className="size-3.5" /> Assign reference
          </button>
        </InspectorSection>

        <InspectorSection title="Versions" trailing={<span className="text-[10px] text-neutral-400">1 total</span>}>
          <div className="flex items-center gap-2.5 rounded-lg border p-2">
            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-neutral-100">
              <Image alt="" className="object-cover" fill sizes="64px" src={shot.image} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-neutral-800">Version 1</p>
              <p className="mt-0.5 text-[10px] text-neutral-400">Generated · Selected</p>
            </div>
            <Check className="size-3.5 text-neutral-500" />
          </div>
          <Button className="w-full" size="sm" variant="outline"><ArrowLeftRight className="size-3.5" /> Compare versions</Button>
        </InspectorSection>

        <InspectorSection title="Timing & sound">
          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Duration" value={`${shot.duration} seconds`} />
            <CompactField label="Audio" value="None" />
          </div>
          <button className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900" type="button">
            <MessageSquareText className="size-3.5" /> Add dialogue or voice-over
          </button>
        </InspectorSection>

        <details className="border-b px-4 py-3 text-xs">
          <summary className="cursor-pointer font-medium text-neutral-500 hover:text-neutral-900">Advanced and provenance</summary>
          <p className="mt-3 leading-5 text-neutral-500">Provider, model, compiled prompt, inputs, and seed remain inspectable here without competing with shot direction.</p>
        </details>
      </div>
    </div>
  );
}

function InspectorSection({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-b px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em] text-neutral-500">{title}</h3>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function CompactField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">{label}</span>
      <button className="flex h-8 w-full items-center justify-between gap-2 rounded-md border px-2.5 text-left text-xs text-neutral-700 hover:border-neutral-400" type="button">
        <span className="truncate">{value}</span><ChevronDown className="size-3 text-neutral-400" />
      </button>
    </label>
  );
}

function ReferenceLibrary({
  selectedReferenceId,
  onSelectReference,
}: {
  selectedReferenceId: string;
  onSelectReference: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | ReferenceCategory>('all');
  const selectedReference = references.find((reference) => reference.id === selectedReferenceId) ?? references[0];
  const filtered = filter === 'all' ? references : references.filter((reference) => reference.category === filter);

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-[220px] shrink-0 border-r bg-white p-3 lg:block">
        <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Library</p>
        {[
          { id: 'all' as const, label: 'All references', count: references.length, icon: FolderOpen },
          { id: 'character' as const, label: 'Characters', count: 2, icon: UsersRound },
          { id: 'location' as const, label: 'Locations', count: 1, icon: MapPin },
          { id: 'look' as const, label: 'Looks', count: 0, icon: WandSparkles },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={cn(
                'mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors',
                filter === item.id ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
              )}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              <Icon className="size-3.5" />
              <span className="flex-1 text-left">{item.label}</span>
              <span className={filter === item.id ? 'text-neutral-400' : 'text-neutral-400'}>{item.count}</span>
            </button>
          );
        })}
        <div className="my-3 border-t" />
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Collections</p>
        <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-neutral-600 hover:bg-neutral-100" type="button">
          <FolderOpen className="size-3.5" /> Principal cast <span className="ml-auto text-neutral-400">2</span>
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-neutral-600 hover:bg-neutral-100" type="button">
          <Plus className="size-3.5" /> New collection
        </button>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f7f6f3] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Project references</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">The Great Police Riot — 1857</h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-neutral-500">Reusable subjects, environments, props, and looks. References are assigned only where they belong.</p>
          </div>
          <div className="mb-4 flex gap-1 overflow-x-auto lg:hidden">
            {(['all', 'character', 'location', 'look'] as const).map((item) => (
              <button className={cn('rounded-full px-3 py-1.5 text-xs capitalize', filter === item ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-black/10')} key={item} onClick={() => setFilter(item)} type="button">{item}</button>
            ))}
          </div>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((reference) => (
                <button
                  className={cn(
                    'overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md',
                    selectedReference.id === reference.id ? 'ring-2 ring-neutral-900 ring-offset-2 ring-offset-[#f7f6f3]' : 'ring-black/8',
                  )}
                  key={reference.id}
                  onClick={() => onSelectReference(reference.id)}
                  type="button"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
                    <Image alt={`${reference.name} reference`} className="object-cover" fill sizes="(max-width: 900px) 100vw, 33vw" src={reference.image} />
                    <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold capitalize text-neutral-800 shadow-sm">{reference.category}</span>
                  </div>
                  <div className="p-4">
                    <h2 className="text-sm font-semibold text-neutral-950">{reference.name}</h2>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-neutral-500">{reference.description}</p>
                    <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400">Used in {reference.usedBy.length} shots</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white px-6 py-16 text-center">
              <WandSparkles className="mx-auto size-5 text-neutral-400" />
              <p className="mt-3 text-sm font-medium">No look references yet</p>
              <p className="mt-1 text-xs text-neutral-500">Create or import a reusable visual treatment.</p>
              <Button className="mt-4" size="sm">Add look</Button>
            </div>
          )}
        </div>
      </main>

      <aside className="hidden w-[320px] shrink-0 border-l bg-white xl:block">
        <div className="border-b px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{selectedReference.category}</p>
          <h2 className="mt-1 text-base font-semibold">{selectedReference.name}</h2>
        </div>
        <div className="space-y-5 p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
            <Image alt="" className="object-cover" fill sizes="320px" src={selectedReference.image} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Description</p>
            <p className="mt-2 text-xs leading-5 text-neutral-600">{selectedReference.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Origin</p><p className="mt-1.5 text-xs text-neutral-700">{selectedReference.origin}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Assets</p><p className="mt-1.5 text-xs text-neutral-700">1 image</p></div>
          </div>
          <div>
            <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Used by</p><span className="text-[10px] text-neutral-400">{selectedReference.usedBy.length} shots</span></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedReference.usedBy.map((shotNumber) => <span className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[10px] text-neutral-600" key={shotNumber}>SHOT {String(shotNumber).padStart(2, '0')}</span>)}
            </div>
          </div>
          <Button className="w-full" size="sm" variant="outline"><Copy className="size-3.5" /> Add another view</Button>
        </div>
      </aside>
    </div>
  );
}

function GenerationDialog({ open, onOpenChange, shot }: { open: boolean; onOpenChange: (open: boolean) => void; shot: PrototypeShot }) {
  const assignedReferences = references.filter((reference) => shot.referenceIds.includes(reference.id));

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4" /> Generate alternative</DialogTitle>
          <DialogDescription>Review creative direction and inputs before starting a paid generation.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="border-b px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <div><p className="text-xs font-semibold">Target</p><p className="mt-0.5 text-[11px] text-neutral-500">1 shot · 1 new version</p></div>
              <button className="text-xs font-medium text-neutral-500 hover:text-neutral-900" type="button">Change</button>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-neutral-50 p-2.5">
              <div className="relative h-14 w-[74px] shrink-0 overflow-hidden rounded-md bg-neutral-200"><Image alt="" className="object-cover" fill sizes="74px" src={shot.image} /></div>
              <div className="min-w-0"><p className="font-mono text-[10px] text-neutral-400">SHOT {String(shot.number).padStart(2, '0')}</p><p className="mt-0.5 truncate text-xs font-semibold">{shot.title}</p><p className="mt-1 truncate text-[11px] text-neutral-500">{shot.beat}</p></div>
            </div>
          </div>
          <div className="border-b px-6 py-5">
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold">Reference assignments</p><span className="text-[11px] text-neutral-400">{assignedReferences.length} included</span></div>
            <div className="space-y-2">
              {assignedReferences.map((reference) => (
                <div className="flex items-center gap-3 rounded-lg border p-2.5" key={reference.id}>
                  <ReferenceThumb reference={reference} />
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{reference.name}</p><p className="mt-0.5 text-[10px] text-neutral-400">{reference.category === 'character' ? 'Subject identity' : 'Environment'} · Scene default</p></div>
                  <CircleCheck className="size-4 text-neutral-500" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-4 text-neutral-500">Only references assigned to this shot will be sent. Provider limits are checked before the run starts.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-3">
            <CompactField label="Provider" value="OpenAI" />
            <CompactField label="Quality" value="Draft" />
            <CompactField label="Outputs" value="1 version" />
          </div>
        </div>
        <DialogFooter className="items-center border-t bg-neutral-50 px-6 py-4 sm:justify-between">
          <p className="text-[11px] text-neutral-500">Final cost shown before submission</p>
          <div className="flex gap-2"><Button onClick={() => onOpenChange(false)} size="sm" variant="outline">Cancel</Button><Button size="sm"><Sparkles className="size-3.5" /> Review cost</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StoryboardPrototype() {
  const [section, setSection] = useState<WorkspaceSection>('storyboards');
  const [view, setView] = useState<StoryboardView>('board');
  const [selectedShotId, setSelectedShotId] = useState('shot-1');
  const [selectedReferenceId, setSelectedReferenceId] = useState('elias');
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const selectedShot = useMemo(() => shots.find((shot) => shot.id === selectedShotId) ?? shots[0], [selectedShotId]);

  const selectShot = (shotId: string) => {
    setSelectedShotId(shotId);
    setInspectorOpen(true);
  };

  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-white text-neutral-950">
      <header className="z-30 flex h-14 shrink-0 items-center border-b bg-white px-3 sm:px-4">
        <Link className="mr-3 flex items-center gap-2.5 sm:mr-6" href="/">
          <span className="flex size-8 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">L</span>
          <span className="hidden sm:block"><span className="block text-xs font-semibold tracking-[0.18em]">LUMEN</span><span className="block text-[9px] text-neutral-400">Director workspace</span></span>
        </Link>
        <button className="hidden max-w-[280px] items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-neutral-50 md:flex" type="button">
          <span className="truncate text-xs font-medium">The Great Police Riot — 1857</span><ChevronDown className="size-3 text-neutral-400" />
        </button>
        <div className="mx-auto flex h-full items-center">
          <SectionButton active={section === 'storyboards'} onClick={() => setSection('storyboards')}>Storyboards</SectionButton>
          <SectionButton active={section === 'references'} onClick={() => setSection('references')}>References</SectionButton>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 sm:inline">Prototype</span>
          <Button className="hidden sm:flex" size="sm" variant="ghost">Share</Button>
          <button className="flex size-8 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-semibold" type="button">J</button>
        </div>
      </header>

      {section === 'storyboards' ? (
        <>
          <div className="z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-white px-3 sm:px-4">
            <button className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 lg:hidden" onClick={() => setMobileOutlineOpen(true)} type="button"><Menu className="size-4" /><span className="sr-only">Open outline</span></button>
            <button className="hidden rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 lg:block" onClick={() => setOutlineOpen((current) => !current)} type="button">
              {outlineOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}<span className="sr-only">Toggle outline</span>
            </button>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-xs font-semibold">Great Police Riot <span className="font-normal text-neutral-400">/ Storyboard 01</span></p>
            </div>
            <div className="mx-auto md:mx-0"><ViewTabs onChange={setView} view={view} /></div>
            <div className="ml-auto flex flex-1 items-center justify-end gap-1 sm:gap-2 md:flex-none">
              <Button className="hidden sm:flex" onClick={() => setGenerationOpen(true)} size="sm"><Sparkles className="size-3.5" /> Generate</Button>
              <Button aria-label="Generate" className="sm:hidden" onClick={() => setGenerationOpen(true)} size="icon-sm"><Sparkles className="size-3.5" /></Button>
              <button className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 xl:hidden" onClick={() => setMobileInspectorOpen(true)} type="button"><PanelRightOpen className="size-4" /><span className="sr-only">Open shot inspector</span></button>
              <button className="hidden rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 xl:block" onClick={() => setInspectorOpen((current) => !current)} type="button">
                {inspectorOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}<span className="sr-only">Toggle shot inspector</span>
              </button>
              <button className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" type="button"><MoreHorizontal className="size-4" /><span className="sr-only">Storyboard actions</span></button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {outlineOpen && <aside className="hidden w-[240px] shrink-0 border-r lg:block"><StoryboardOutline onSelectShot={selectShot} selectedShotId={selectedShotId} /></aside>}
            <main className="min-w-0 flex-1 overflow-y-auto">
              {view === 'board' && <BoardView onSelectShot={selectShot} selectedShotId={selectedShotId} />}
              {view === 'shot-list' && <ShotListView onSelectShot={selectShot} selectedShotId={selectedShotId} />}
              {view === 'timing' && <TimingView onSelectShot={selectShot} selectedShot={selectedShot} />}
            </main>
            {inspectorOpen && <aside className="hidden w-[330px] shrink-0 border-l xl:block"><ShotInspector onGenerate={() => setGenerationOpen(true)} shot={selectedShot} /></aside>}
          </div>

          <Sheet onOpenChange={setMobileOutlineOpen} open={mobileOutlineOpen}>
            <SheetContent className="w-[280px] gap-0 p-0" side="left">
              <SheetHeader className="sr-only"><SheetTitle>Storyboard outline</SheetTitle><SheetDescription>Navigate scenes and shots.</SheetDescription></SheetHeader>
              <StoryboardOutline onSelectShot={(id) => { selectShot(id); setMobileOutlineOpen(false); }} selectedShotId={selectedShotId} />
            </SheetContent>
          </Sheet>
          <Sheet onOpenChange={setMobileInspectorOpen} open={mobileInspectorOpen}>
            <SheetContent className="w-[330px] gap-0 p-0 sm:max-w-[330px]" side="right">
              <SheetHeader className="sr-only"><SheetTitle>Shot inspector</SheetTitle><SheetDescription>Edit the selected shot.</SheetDescription></SheetHeader>
              <ShotInspector onGenerate={() => { setMobileInspectorOpen(false); setGenerationOpen(true); }} shot={selectedShot} />
            </SheetContent>
          </Sheet>
          <GenerationDialog onOpenChange={setGenerationOpen} open={generationOpen} shot={selectedShot} />
        </>
      ) : (
        <>
          <div className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-3 sm:px-4">
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">Reference library</p><p className="hidden text-[10px] text-neutral-400 sm:block">Project scope · 3 references</p></div>
            <div className="relative hidden w-full max-w-xs sm:block"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" /><input className="h-8 w-full rounded-md border bg-neutral-50 pl-8 pr-3 text-xs outline-none focus:border-neutral-400" placeholder="Search references" /></div>
            <Button size="sm" variant="outline"><Upload className="size-3.5" /><span className="hidden sm:inline">Import</span></Button>
            <Button size="sm"><Plus className="size-3.5" /><span className="hidden sm:inline">Add reference</span></Button>
          </div>
          <ReferenceLibrary onSelectReference={setSelectedReferenceId} selectedReferenceId={selectedReferenceId} />
        </>
      )}
    </div>
  );
}
