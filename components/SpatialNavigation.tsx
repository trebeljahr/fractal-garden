import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_SPATIAL_PLACE, type SpatialPlace } from "../utils/spatial/places";
import { FlightTouchControls, type FlightTouchInput } from "./FlightTouchControls";
import { PlacesMenu } from "./FractalPlaces";

export function SpatialNavigation({
  input,
  places,
  onSelect,
}: {
  input: FlightTouchInput;
  places: SpatialPlace[];
  onSelect: (place: SpatialPlace) => void;
}) {
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => {
    setHost(document.querySelector("[data-fractal-places-host]"));
  }, []);
  return (
    <>
      {host &&
        createPortal(
          <PlacesMenu views={[DEFAULT_SPATIAL_PLACE, ...places]} onSelect={onSelect} />,
          host,
        )}
      <FlightTouchControls input={input} />
    </>
  );
}
