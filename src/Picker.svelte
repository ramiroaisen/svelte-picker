<script>
import {createEventDispatcher} from 'svelte';
const dispatch = createEventDispatcher();
// change

import Base from "./Base.svelte";

let base;

export let startColor;
export let className = "";
export const setColor = (color) => base && base.setColor(color);

let isFirstChange = true;

const handleChange = ({detail}) => {
  if(isFirstChange){
    isFirstChange = false;
    return;
  }
  dispatch("colorChange", detail)
}
</script>

<Base
  bind:this={base}
  {className}
  {startColor}
  on:colorChange={handleChange}
/>