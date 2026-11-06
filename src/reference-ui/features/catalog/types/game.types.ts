export type ProductProviderType = 'Manual' | 'Direct Top-ups' | 'GiftCards & Vouchers';

export interface ProductInputOption {
  label: string;
  value: string;
}

export type ValidationSourceLabel = 'MLBB' | 'G2' | 'SmileOne' | 'LG';
export type ProductInputOptionSource = 'manual' | 'validation_api';

export interface ProductInputField {
  id: string;
  label: string;
  type: 'Text Input' | 'Dropdown';
  options?: Array<ProductInputOption | string>;
  placeholder?: string;
  required?: boolean;
  providerKey?: string;
  /** Exact validation-provider request key. Missing means this field is not used for API Validation. */
  validationKey?: string;
  /** User-facing validation provider label. Keep aligned with the API Validation selector. */
  validationSource?: ValidationSourceLabel;
  optionSource?: ProductInputOptionSource;
}

export interface GameItem {
  id: string;
  name: string;
  discount: number;
  sort: number;
  orderCount: number;
  totalSold: string;
  isActive: boolean;
  provider?: ProductProviderType;
  image?: string;
  imageStorageReference?: string;
  category?: string;
  note?: string;
  validationCode?: string;
  inputFields?: ProductInputField[];
  deliveryEstimate?: string;
}

export interface GameFilterState {
  provider: 'all' | ProductProviderType;
  status: 'all' | 'active' | 'inactive';
}
