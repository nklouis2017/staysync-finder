import axiosInstance, { ResponseBase, Pagination, fetchForSEO } from './index';

// ==================== Types ====================

export interface BaseEntity {
  code: string | null;
  name: string;
  id: number;
  uuid: string;
  status: number;
  isMarketplace: number;
}

export interface OwnerUu extends BaseEntity {
  username?: string;
  email?: string;
  bankNumber?: string | null;
  bankName?: string | null;
  profileImage?: string | null;
  identityNumber?: string | null;
  phoneNumber?: string;
}

export interface ProvinceInfo {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  fullNameEn: string;
}

export interface WardInfo {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  fullNameEn: string;
  provinceCode: string;
}

export interface ApartmentUu extends BaseEntity {
  roomCount: number;
  avgStars: number;
  numFeedback: number;
  numChild: number;
  ownerUu: OwnerUu;
  apartmentSize: number;
  numFloor: number;
  apartmentTypeUu: BaseEntity & { description?: string };
  managerUu: OwnerUu;
  longitude: number | null;
  latitude: number | null;
  province: ProvinceInfo;
  ward: WardInfo;
  address: string;
  point: number | null;
  state: number;
  description?: string | null;
  roomTypeGroups?: RoomTypeGroup[];
  furnitureTypeGroups?: FurnitureTypeGroup[];
}

export interface RoomTypeGroup {
  roomUu: BaseEntity & { iconPath?: string | null };
  count: number;
}

export interface FurnitureTypeGroup {
  furnitureUu: BaseEntity & { iconPath?: string | null };
  count: number;
}

export interface ServicePrice {
  serviceUu: {
    name: string;
    description: string;
    unit: string;
    state: number;
    type: number;
    defaultTypePayment: number;
    defaultPrice: number;
    iconPath: string | null;
    id: number;
    uuid: string;
    status: number;
    isMarketplace: number;
  };
  price: number;
  paymentCycle: number;
  type: number;
  unit: string;
  id: number;
  uuid: string;
  status: number;
  isMarketplace: number;
}

export interface AdvertisementData {
  companyUu: BaseEntity;
  title: string;
  apartmentUu: ApartmentUu;
  price: number;
  deposit: number;
  isSaved: number;
  images: string[];
  preDeposit: number;
  start: string | null;
  canPreDeposit: boolean;
  userPreDeposit: string;
  point: number | null;
  countView?: number;
  updateDate?: string;
  viewCount?: number;
  startDate?: string;
  isJoinPromo?: number;
  id: number;
  uuid: string;
  status: number;
  isMarketplace: number;
}

export interface AdvertisementDetailData {
  code: string;
  viewCount: number;
  apartmentUu: ApartmentUu;
  userPostUu: BaseEntity;
  companyUu: BaseEntity;
  adWaterInfo: ServicePrice | null;
  adElectricInfo: ServicePrice | null;
  adPrices: ServicePrice[];
  title: string;
  price: number;
  deposit: number;
  images: string[];
  phoneNumber: string;
  startDate: string | null;
  expireDate: string | null;
  description: string | null;
  state: number;
  updatedAt: string;
  childAds: AdvertisementDetailData[];
  preDeposit: number;
  canPreDeposit: boolean;
  userPreDeposit: string | null;
  roomFurnitures: unknown | null;
  isJoinPromo?: number;
  id: number;
  uuid: string;
  status: number;
  isMarketplace: number;
}

export interface GetListAdvertisementRequest {
  keyword?: string;
  isPaging?: number;
  page?: number;
  pageSize?: number;
  typeFinding?: number;
  typeOrder?: number;
  parentApartmentUuid?: string;
  apartmentCode?: string;
  apartmentUuid?: string;
  priceFrom?: number;
  priceTo?: number;
  adsLikeds?: string[];
  apartmentTypeUuid?: string;
  apartmentSizeFrom?: number;
  apartmentSizeTo?: number;
  numRoomFrom?: number;
  numRoomTo?: number;
  provinceId?: string;
  wardId?: string;
  address?: string;
  isHot?: number;
  neLat?: number | null;
  neLng?: number | null;
  swLat?: number | null;
  swLng?: number | null;
}

export interface GetSimilarAdvertisementRequest {
  keyword?: string;
  isPaging?: number;
  page?: number;
  pageSize?: number;
  uuid: string;
}

export interface GetAdvertisementsForMapRequest {
  keyword?: string;
  isPaging?: number;
  page?: number;
  pageSize?: number;
  typeFinding?: number;
  typeOrder?: number;
  parentApartmentUuid?: string;
  apartmentCode?: string;
  apartmentUuid?: string;
  priceFrom?: number;
  priceTo?: number;
  apartmentTypeUuid?: string;
  apartmentSizeFrom?: number;
  apartmentSizeTo?: number;
  numRoomFrom?: number;
  numRoomTo?: number;
  provinceId?: string;
  wardId?: string;
  address?: string;
  isHot?: number;
  neLat?: number | null;
  neLng?: number | null;
  swLat?: number | null;
  swLng?: number | null;
}

export interface GetListAdvertisementResponse {
  items: AdvertisementData[];
  pagination: Pagination;
}

export interface MapLocationGroup {
  point: string; // "[lat,lng]"
  longitude: number;
  address: string;
  totalAds: number;
  ads: AdvertisementData[];
}

export interface GetAdvertisementsForMapResponse {
  items: MapLocationGroup[];
  pagination: Pagination;
}

// ==================== API Functions (axios) ====================

const advertisementService = {
  getListPaged: (request: GetListAdvertisementRequest): Promise<ResponseBase<GetListAdvertisementResponse>> => {
    return axiosInstance.post('/Advertisement/customer-get-list-paged-advertisement', request);
  },

  getSimilar: (request: GetSimilarAdvertisementRequest): Promise<ResponseBase<GetListAdvertisementResponse>> => {
    return axiosInstance.post('/Advertisement/get-similar-advertisement', request);
  },

  getForMap: (request: GetAdvertisementsForMapRequest): Promise<ResponseBase<GetAdvertisementsForMapResponse>> => {
    return axiosInstance.post('/Advertisement/get-advertisements-for-map', request);
  },

  getByUuid: (uuid: string): Promise<ResponseBase<AdvertisementDetailData>> => {
    return axiosInstance.post('/Advertisement/get-advertisement-by-uuid', { uuid });
  },
};

export default advertisementService;

// ==================== Server-side fetch for SEO ====================

export function fetchAdvertisementByUuid(uuid: string) {
  return fetchForSEO<AdvertisementDetailData>('Advertisement/get-advertisement-by-uuid', { uuid });
}

export function fetchListAdvertisement(request: GetListAdvertisementRequest) {
  return fetchForSEO<GetListAdvertisementResponse>('Advertisement/customer-get-list-paged-advertisement', request);
}
