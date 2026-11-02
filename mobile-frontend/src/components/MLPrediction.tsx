import React from "react";
import { RouteResults } from "./RouteResults";
import type { MarketComparison } from "../types/atie";

interface Props {
  markets: MarketComparison[];
  originCode?: string;
}

export function MLPrediction(props: Props) {
  return <RouteResults {...props} />;
}

export { RouteResults as default };
