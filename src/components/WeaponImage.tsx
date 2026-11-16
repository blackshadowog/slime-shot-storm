import { GUNS } from '../game/data';

export default function WeaponImage({
  id, src, className = '', decorative = false,
}: { id: string; src?: string; className?: string; decorative?: boolean }) {
  const name = GUNS.find(gun => gun.id === id)?.name ?? id;
  return src ? (
    <img
      className={`weapon-image ${className}`}
      src={src}
      alt={decorative ? '' : `${name} in-game 3D weapon`}
      width={768}
      height={432}
      draggable={false}
      decoding="sync"
    />
  ) : (
    <span className={`weapon-image weapon-image--loading ${className}`} role="status" aria-label={`Loading ${name} model`} />
  );
}