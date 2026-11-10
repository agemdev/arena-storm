import {
  Armchair,
  Car,
  Cpu,
  Gamepad,
  Gamepad2,
  Glasses,
  Headphones,
  Joystick,
  Keyboard,
  Laptop,
  Monitor,
  MonitorPlay,
  Mouse,
  Projector,
  Smartphone,
  Swords,
  Tablet,
  Trophy,
  Tv,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Ícones que podem ser escolhidos para as máquinas (além de qualquer emoji)
export const ICONES_MAQUINA: Record<string, LucideIcon> = {
  Monitor,
  MonitorPlay,
  Laptop,
  Cpu,
  Keyboard,
  Mouse,
  Gamepad2,
  Gamepad,
  Joystick,
  Tv,
  Projector,
  Car,
  Glasses,
  Headphones,
  Smartphone,
  Tablet,
  Armchair,
  Trophy,
  Swords,
  Wrench,
};

// Ícone padrão de cada tipo
const PADRAO: Record<string, string> = { pc: "Monitor", console: "Gamepad2", simulador: "Car", vr: "Glasses", outro: "Tv" };

// Mostra o ícone escolhido (da lista ou emoji); vazio = ícone do tipo
export default function IconeMaquina({ icone, tipo, className = "" }: { icone?: string | null; tipo?: string; className?: string }) {
  const nome = icone || PADRAO[tipo ?? ""] || "Monitor";
  const Icone = ICONES_MAQUINA[nome];
  if (Icone) return <Icone className={className} />;
  return (
    <span className={`inline-flex items-center justify-center leading-none ${className}`} aria-hidden>
      {nome}
    </span>
  );
}
