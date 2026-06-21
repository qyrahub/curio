import { useEffect, useState } from "react";
export function useHashRoute(): [string, (r: string) => void] {
  const get = () => (window.location.hash.replace(/^#\/?/, "") || "home");
  const [route, setRoute] = useState(get());
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const nav = (r: string) => { window.location.hash = `/${r}`; };
  return [route, nav];
}
