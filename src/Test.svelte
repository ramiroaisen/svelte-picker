<script>
import { onMount } from 'svelte';
import Picker from './Picker.svelte';

let p1, p2;
// For use from devTools
onMount(() => {
  window.p1 = p1
  window.p2 = p2
})

const log = (e) => console.log(e.detail);
</script>

<Picker 
  bind:this={p1}
  on:colorChange={log}
  startColor="#FFFFFF"
/>

<Picker
  bind:this={p2}
  startColor="#000FFF"
  on:colorChange={log}
  on:colorChange={(e) => {
    p1.setColor(e.detail)
  }}
/>