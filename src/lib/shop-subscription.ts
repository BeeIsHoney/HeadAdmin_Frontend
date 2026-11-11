export const SHOP_PLANS = [{id:'DEFAULT',label:'Default',durationMonths:1},{id:'PRO',label:'Pro',durationMonths:1},{id:'PRO_PLUS',label:'Pro Plus',durationMonths:3},{id:'ULTRA',label:'Ultra',durationMonths:1}] as const;
export const SHOP_FEATURES = [
 {id:'homeBanner',label:'Home Banner'}, {id:'shopCatalog',label:'Shop Catalog Banner'},
 {id:'profileBanner',label:'Profile Banner'}, {id:'lightDark',label:'Light / Dark'},
 {id:'liveStockMode',label:'Live Stock Mode'}, {id:'specialOffers',label:'Special Offers'},
 {id:'orderAnimation',label:'Order Animation'}, {id:'resellerProgram',label:'Reseller Program'},
] as const;
export type ShopPlan = typeof SHOP_PLANS[number]['id'];
export type ShopFeature = typeof SHOP_FEATURES[number]['id'];
export type FeatureSet = Record<ShopFeature,boolean>;
export interface ShopSubscription {plan:ShopPlan;durationMonths:1|3;startedAt:string;expiresAt:string;expired:boolean;enabled:boolean;permissions:FeatureSet;settings:FeatureSet;features:FeatureSet}
export const readPermissions = (form:FormData):FeatureSet => Object.fromEntries(SHOP_FEATURES.map(f=>[f.id,form.get('feature-'+f.id)==='on'])) as FeatureSet;
