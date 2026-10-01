<script>
  // "Last made 6 days ago": terracotta when made within RECENT_DAYS, green otherwise.
  import Icon from './Icon.svelte';
  import { planner, lastMadeOn, madeRecently } from '../planner.svelte.js';
  import { formatLastMade, formatLong } from '../dates.js';

  /** @type {{ recipeId: string, class?: string }} */
  let { recipeId, class: className = '' } = $props();

  const madeOn = $derived(lastMadeOn(recipeId));
  const recent = $derived(madeRecently(recipeId));
</script>

<p
  class="flex items-center gap-1 {recent ? 'text-secondary' : 'text-[#2e7445]'} {className}"
  title={madeOn ? formatLong(madeOn) : undefined}
>
  <Icon name="history" class="text-[1.15em]" />
  {formatLastMade(madeOn, planner.today)}
</p>
