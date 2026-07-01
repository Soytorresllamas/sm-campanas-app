import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Historial de deshacer genérico basado en snapshots JSON. El arreglo de snapshots
 * vive en un ref (no necesita causar renders por sí mismo); `historySize` es el
 * único bit de estado real, para que la UI (p. ej. el botón deshacer) pueda leer
 * "¿hay algo que deshacer?" sin acceder al ref durante el render.
 */
export function useHistory<T>(getCurrent: () => T, setValue: (v: T) => void, maxSize = 60) {
  const historyRef = useRef<string[]>([]);
  const [historySize, setHistorySize] = useState(0);

  const pushHistory = useCallback(() => {
    historyRef.current.push(JSON.stringify(getCurrent()));
    if (historyRef.current.length > maxSize) historyRef.current.shift();
    setHistorySize(historyRef.current.length);
  }, [getCurrent, maxSize]);

  const discardLast = useCallback(() => {
    historyRef.current.pop();
    setHistorySize(historyRef.current.length);
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    setHistorySize(historyRef.current.length);
    if (prev) setValue(JSON.parse(prev) as T);
  }, [setValue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  return { historySize, pushHistory, discardLast, undo };
}
