import React from 'react';
import { 
  DollarSign, ShoppingCart, Utensils, Home, Car, BookOpen, 
  HeartPulse, Shirt, Film, Tv, Briefcase, Award, TrendingUp, 
  Gift, Tag, CreditCard, Wallet, Landmark, PiggyBank,
  Users, User
} from 'lucide-react';

export function formatMoney(amount: number, currency: string = '₽'): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`;
}

export function getCategoryIcon(iconName: string, className: string = "w-5 h-5") {
  switch (iconName) {
    case 'shopping-cart': return <ShoppingCart className={className} />;
    case 'utensils': return <Utensils className={className} />;
    case 'home': return <Home className={className} />;
    case 'car': return <Car className={className} />;
    case 'book-open': return <BookOpen className={className} />;
    case 'heart-pulse': return <HeartPulse className={className} />;
    case 'shirt': return <Shirt className={className} />;
    case 'film': return <Film className={className} />;
    case 'tv': return <Tv className={className} />;
    case 'briefcase': return <Briefcase className={className} />;
    case 'award': return <Award className={className} />;
    case 'trending-up': return <TrendingUp className={className} />;
    case 'gift': return <Gift className={className} />;
    case 'credit-card': return <CreditCard className={className} />;
    case 'wallet': return <Wallet className={className} />;
    case 'piggy-bank': return <PiggyBank className={className} />;
    default: return <Tag className={className} />;
  }
}
