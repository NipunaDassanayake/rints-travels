import type { StaticImageData } from "next/image";

import ellaImage from "../../../public/images/home/destinations/ella.jpg";

import galleImage from "../../../public/images/home/destinations/galle.jpg";

import kandyImage from "../../../public/images/home/destinations/kandy.jpg";

import mirissaImage from "../../../public/images/home/destinations/mirissa.jpg";

import sigiriyaImage from "../../../public/images/home/destinations/sigiriya.jpg";

/*
 * Curated homepage destinations (CR-029). `query` is sent to the
 * packages API's existing case-insensitive "contains" filter on
 * the package destination.
 *
 * `image` is null where no suitable photograph exists yet (Nuwara
 * Eliya's source is too small for a 4:5 card); the card then uses
 * a designed, photo-free treatment instead of a stretched image.
 */

export type Destination = {
  name: string;
  region: string;
  caption: string;
  query: string;
  image: StaticImageData | null;
  imageAlt: string;
};

export const DESTINATIONS: Destination[] = [
  {
    name: "Sigiriya",
    region: "Cultural Triangle",
    caption: "A fifth-century rock fortress rising from the dry-zone forest.",
    query: "Sigiriya",
    image: sigiriyaImage,
    imageAlt: "Forested hills around a rock outcrop at sunrise",
  },
  {
    name: "Kandy",
    region: "Hill capital",
    caption: "The last royal capital and home of the Temple of the Sacred Tooth Relic.",
    query: "Kandy",
    image: kandyImage,
    imageAlt: "The white walls of the Temple of the Sacred Tooth Relic in Kandy",
  },
  {
    name: "Ella",
    region: "Hill Country",
    caption: "Tea slopes, ridge walks and the Nine Arch Bridge.",
    query: "Ella",
    image: ellaImage,
    imageAlt: "A blue train crossing the Nine Arch Bridge near Ella",
  },
  {
    name: "Nuwara Eliya",
    region: "Tea Country",
    caption: "Cool highland air, misty mornings and rolling tea estates.",
    query: "Nuwara Eliya",
    image: null,
    imageAlt: "",
  },
  {
    name: "Galle",
    region: "South coast",
    caption: "Ramparts, a lighthouse and quiet lanes inside a UNESCO-listed fort.",
    query: "Galle",
    image: galleImage,
    imageAlt: "A lighthouse above old fort ramparts at dusk",
  },
  {
    name: "Mirissa",
    region: "South coast",
    caption: "Palm-fringed bays and seasonal whale watching.",
    query: "Mirissa",
    image: mirissaImage,
    imageAlt: "A palm-fringed beach above clear turquoise water",
  },
];

export const POPULAR_DESTINATIONS = ["Ella", "Kandy", "Galle", "Sigiriya"];

/** Matches the API's limit on the destination field. */
export const MAX_DESTINATION_LENGTH = 100;

/** Packages filtered by destination; an empty value browses everything. */
export function packagesForDestination(destination: string) {
  const value = destination.trim().slice(0, MAX_DESTINATION_LENGTH);

  return value ? `/packages?destination=${encodeURIComponent(value)}` : "/packages";
}
