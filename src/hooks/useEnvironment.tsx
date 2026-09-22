import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Ambiente = 'real' | 'teste';

const KEY = 'crm-ambiente';

const EnvContext = createContext<{ ambiente: Ambiente; toggle: () => void }>({
  ambiente: 'real',
  toggle: () => {},
});

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [ambiente, setAmbiente] = useState<Ambiente>(() =>
    (localStorage.getItem(KEY) as Ambiente) === 'teste' ? 'teste' : 'real',
  );

  useEffect(() => {
    localStorage.setItem(KEY, ambiente);
    document.documentElement.classList.toggle('dark', ambiente === 'teste');
  }, [ambiente]);

  const toggle = () => setAmbiente((a) => (a === 'teste' ? 'real' : 'teste'));

  return <EnvContext.Provider value={{ ambiente, toggle }}>{children}</EnvContext.Provider>;
}

export const useEnvironment = () => useContext(EnvContext);
