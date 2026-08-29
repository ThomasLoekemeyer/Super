// Arquitectura de providers de supermercados (etapa posterior).
//
// IMPORTANTE: Coto, Carrefour, Jumbo, Día, Disco, Vea y Rappi NO tienen
// APIs públicas de checkout. Por eso la interfaz separa responsabilidades
// para que cada capa pueda implementarse con lo que exista (scraping
// autorizado, APIs de terceros, deep links, o carga manual asistida):
//
//   - precios          -> getPrice()
//   - disponibilidad   -> getAvailability()
//   - matching         -> searchProduct() / getProductDetails()
//   - carrito          -> buildCart()
//   - checkout         -> getCartUrl() (deep link; el pago lo hace el usuario)
//
// El comparador de supermercados de la etapa 2 consume esta interfaz:
// registra N providers y compara searchProduct()+getPrice() por producto.

export interface ExternalProduct {
  externalId: string;
  name: string;
  brand: string | null;
  price: number | null;
  currency: string;
  unit: string | null;
  imageUrl: string | null;
  url: string | null;
}

export interface Availability {
  available: boolean;
  stockLevel?: "high" | "low" | "out_of_stock" | "unknown";
}

export interface CartLine {
  externalId: string;
  quantity: number;
}

export interface BuiltCart {
  provider: string;
  lines: CartLine[];
  estimatedTotal: number | null;
  /** Referencia interna del carrito si el proveedor lo soporta. */
  externalCartId: string | null;
}

export interface SupermarketProvider {
  readonly id: string;
  readonly displayName: string;

  searchProduct(query: string): Promise<ExternalProduct[]>;
  getPrice(externalId: string): Promise<number | null>;
  getAvailability(externalId: string): Promise<Availability>;
  getProductDetails(externalId: string): Promise<ExternalProduct | null>;
  buildCart(lines: CartLine[]): Promise<BuiltCart>;
  /** URL para retomar el carrito/checkout en el sitio o app del súper. */
  getCartUrl(cart: BuiltCart): Promise<string | null>;
}

const registry = new Map<string, SupermarketProvider>();

export function registerProvider(provider: SupermarketProvider): void {
  registry.set(provider.id, provider);
}

export function getProvider(id: string): SupermarketProvider | undefined {
  return registry.get(id);
}

export function listProviders(): SupermarketProvider[] {
  return Array.from(registry.values());
}
