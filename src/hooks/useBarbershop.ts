import { useContext } from "react";

import { BarbershopContext } from "@/context/barbershopContextValue";

export function useBarbershop() {
  return useContext(BarbershopContext);
}
