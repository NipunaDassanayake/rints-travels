import Form from "next/form";

import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { NativeSelect } from "@/components/ui/native-select";

import {
  MAX_SEARCH_LENGTH,
  SORT_OPTIONS,
  type PackageSearch,
} from "../package-query";

/*
 * Package discovery form (CR-029 Stage 3A). A GET form to
 * /packages via next/form: client-side navigation when hydrated,
 * a normal form submission without JavaScript. The page
 * normalises the resulting URL (package-query.ts), so empty
 * fields and the default sort never stay in the address bar.
 *
 * Changing the sort does not submit on its own (WCAG 3.2.2): the
 * Search button applies every field together.
 */
export function PackageSearchForm({ search }: { search: PackageSearch }) {
  return (
    <Form
      action="/packages"
      role="search"
      aria-label="Search travel packages"
      className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-end">
        <div>
          <label htmlFor="packages-destination" className="text-label text-foreground">
            Destination
          </label>

          <div className="relative mt-2">
            <MapPin
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              id="packages-destination"
              name="destination"
              type="search"
              defaultValue={search.destination}
              placeholder="Try Ella, Kandy or Galle"
              autoComplete="off"
              enterKeyHint="search"
              maxLength={MAX_SEARCH_LENGTH}
              className="h-12 rounded-xl pl-12 text-body md:text-body"
            />
          </div>
        </div>

        <div>
          <label htmlFor="packages-q" className="text-label text-foreground">
            Package name
          </label>

          <Input
            id="packages-q"
            name="q"
            type="search"
            defaultValue={search.q}
            placeholder="e.g. Rail, Coast, Circuit"
            autoComplete="off"
            enterKeyHint="search"
            maxLength={MAX_SEARCH_LENGTH}
            className="mt-2 h-12 rounded-xl text-body md:text-body"
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 md:col-span-2 lg:col-span-1 lg:contents">
          <div>
            <label htmlFor="packages-sort" className="text-label text-foreground">
              Sort by
            </label>

            <NativeSelect
              id="packages-sort"
              name="sort"
              defaultValue={search.sort}
              size="lg"
              wrapperClassName="mt-2"
              className="rounded-xl text-body md:text-body"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <Button type="submit" size="lg" className="h-12 rounded-xl px-6">
            <Search aria-hidden="true" />
            Search
          </Button>
        </div>
      </div>
    </Form>
  );
}
