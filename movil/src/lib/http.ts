// fetch con tiempo máximo y errores legibles.

export class ErrorRed extends Error {
  readonly estado: number | null;

  constructor(message: string, estado: number | null = null) {
    super(message);
    this.name = "ErrorRed";
    this.estado = estado;
  }
}

export async function obtenerJson<T>(url: string, tiempoMaximoMs = 15_000): Promise<T> {
  return pedir(url, tiempoMaximoMs, "application/json", async (resp) => {
    try {
      return (await resp.json()) as T;
    } catch {
      throw new ErrorRed("El servicio respondió con datos no válidos", resp.status);
    }
  });
}

/** Igual que `obtenerJson` pero devuelve el texto (para RSS/XML). */
export async function obtenerTexto(url: string, tiempoMaximoMs = 15_000): Promise<string> {
  return pedir(url, tiempoMaximoMs, "application/rss+xml, application/xml, text/xml, */*", (resp) => resp.text());
}

/** Texto de una página web o de un POST de formulario (para sacar la foto de una noticia). */
export async function obtenerPagina(url: string, formulario?: string, tiempoMaximoMs = 10_000): Promise<string> {
  const extra: RequestInit = formulario
    ? { method: "POST", body: formulario, headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" } }
    : {};
  return pedir(url, tiempoMaximoMs, "text/html, */*", (resp) => resp.text(), extra);
}

async function pedir<T>(
  url: string,
  tiempoMaximoMs: number,
  accept: string,
  leer: (r: Response) => Promise<T>,
  extra: RequestInit = {},
): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), tiempoMaximoMs);
  try {
    const headers = { Accept: accept, ...(extra.headers as Record<string, string> | undefined) };
    const resp = await fetch(url, { ...extra, signal: control.signal, headers });
    if (!resp.ok) throw new ErrorRed(`El servicio respondió con error ${resp.status}`, resp.status);
    return await leer(resp);
  } catch (err) {
    if (err instanceof ErrorRed) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ErrorRed("El servicio tardó demasiado en responder");
    }
    throw new ErrorRed("No hay conexión a internet");
  } finally {
    clearTimeout(temporizador);
  }
}
