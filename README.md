# enhanced fork of svelte-color-picker

# Svelte Picker [\[Demo Page\]](https://ramiroaisen.github.io/svelte-picker)
 [![svelte-v3](https://img.shields.io/badge/svelte-v3-blueviolet.svg)](https://svelte.dev)
## Installation

With npm
```sh
$ npm i svelte-picker
```

## Usage
In your component :
```jsx
<script>
import Picker from 'svelte-picker';
// To bind (not necessary)
let picker;

function handleChange(event){
	const {r, g, b, a, hex}  = event.detail;
	// Note that when you call setColor this will be called too
	// (should we change that?)
}

// You can change the color programatically too
onSomeEvent(() => {
	picker.setColor("#000"); // or
	picker.setColor("#000000"); // or
	picker.setColor({r:0, g:255, b:123});
})
</script>

<Picker
	bind:this={picker}
	alpha={true}
	on:colorchange={handleChange}
	startColor={"#FBFBFB"}
/>
```

| Props | Value Type | Use |
| ------ | ------ | ------ |
| class | string="" | class(es) to be added to the root element |
| alpha | boolean=true | wheather to show or not alpha picker |
| startColor | string | Initial color (hexadecimal without alpha) |
| setColor | function | set the color of the picker from outside (whitout alpha for now) |
| on:colorchange | callback | Given callback gets called every time color changes |


License
----

MIT


Contribute
----
```sh
git clone https://github.com/ramiroaisen/svelte-picker.git
npm i -D
npm run dev
```
opens a dev server
