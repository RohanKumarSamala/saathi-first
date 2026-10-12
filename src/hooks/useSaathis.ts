import { useEffect, useState } from 'react'
import { watchCollection, type Saathi, type Stored } from '../lib/db'
import { firebaseReady } from '../lib/firebase'

export type Profiles = Stored<Saathi>[] | null

/** Live list of published Saathi profiles; null while loading. */
export function useSaathis(): Profiles {
  const [rows, setRows] = useState<Profiles>(firebaseReady ? null : [])
  useEffect(() => {
    if (!firebaseReady) return
    return watchCollection<Saathi>('saathis', setRows, () => setRows([]))
  }, [])
  return rows
}
