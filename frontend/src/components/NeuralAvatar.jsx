import { IMAGES } from "../constants/designTokens";

export default function NeuralAvatar({ src, name, className, role }) {
  if (src) return <img src={src} className={`${className} object-cover`} alt={name} />;
  const fallback = role?.toLowerCase().includes('nurse') ? IMAGES.female : IMAGES.male;

  return (
    <div className={`${className} bg-indigo-600 flex items-center justify-center text-white font-black shadow-inner uppercase`}>
      <span className="text-[75%] leading-none">{name ? name[0].toUpperCase() : "?"}</span>
    </div>
  );
}
