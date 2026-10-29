<script>
  // Tonight's left rail. Cobalt while dinner is still to cook; once it is marked done a persimmon fill runs down it (only
  // when it was just pressed: a card that loads already done shows the end state without the motion).
  let { done = false, celebrate = false } = $props();
</script>

<div class="absolute left-0 top-0 h-full w-1.5 bg-primary" aria-hidden="true">
  {#if done}<div class="absolute inset-0 bg-secondary {celebrate ? 'rail-fill' : ''}"></div>{/if}
</div>
