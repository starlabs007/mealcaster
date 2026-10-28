<script>
  // The "Suggested" chip beside the date on a day card that holds Auto-fill's suggestion (#91): not planned until
  // Accept All. Cobalt tint with Auto-fill's wand, so it reads as Auto-fill's doing beside the solid Tonight chip.
  import Icon from './Icon.svelte';
  import { text } from '../text.js';
</script>

<span class="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm uppercase text-primary">
  <Icon name="auto_fix_high" class="text-[13px]" />
  {text.planner.card.suggested}
</span>
