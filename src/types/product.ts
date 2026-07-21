export interface ProductLinks {
  amazon?: string;
  mercadoLivre?: string;
  shopee?: string;
  aliexpress?: string;
  tiktok?: string;
  netshoes?: string;
  magalu?: string;
  kabum?: string;
  [key: string]: string | undefined;
}

export interface Coupon {
  id?: string;
  code: string;
  discount: string;
  platform?: string;
  description?: string;
}

export interface ProductVote {
  type: 'LIKE' | 'DISLIKE';
  userId: string;
}

export interface ProductAlert {
  userId: string;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order?: number;
}

export interface Product {
  id: string;
  shortId?: number;
  name: string;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  imageUrl: string;
  enhancedImageUrl?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  description?: string | null;
  couponLink?: string | null;
  coupons?: Coupon[];
  alerts?: ProductAlert[];
  links: ProductLinks;
  images?: ProductImage[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  clicks?: number;
  votes?: ProductVote[];
  _count?: {
    likes?: number;
    dislikes?: number;
    comments?: number;
  };
  dropPercent?: number;
  lowestPrice30d?: number;
  highestPrice30d?: number;
}
