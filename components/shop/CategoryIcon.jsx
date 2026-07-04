'use client';
import {
  Sparkles, SprayCan, Shirt, Footprints, Watch, Gem, Cpu, Headphones,
  Smartphone, Laptop, Gamepad2, Home, CookingPot, Lamp, WashingMachine,
  Dumbbell, Tent, Baby, ToyBrick, ShoppingBasket, HeartPulse, PawPrint,
  Car, Briefcase, Package,
} from 'lucide-react';

const MAP = {
  Sparkles, SprayCan, Shirt, Footprints, Watch, Gem, Cpu, Headphones,
  Smartphone, Laptop, Gamepad2, Home, CookingPot, Lamp, WashingMachine,
  Dumbbell, Tent, Baby, ToyBrick, ShoppingBasket, HeartPulse, PawPrint,
  Car, Briefcase,
};

/** Rend l'icône Lucide correspondant au nom, ou Package par défaut. */
export default function CategoryIcon({ name, ...props }) {
  const Icon = MAP[name] ?? Package;
  return <Icon {...props} />;
}
