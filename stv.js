// ==== DOM ====
const container = document.getElementById("barsContainer");
const generateBtn = document.getElementById("generateArray");
const resetBtn = document.getElementById("resetArray");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const userArrayInput = document.getElementById("userArray");
const speedSlider = document.getElementById("speed");
const sizeSlider = document.getElementById("arraySize");
const sizeValue = document.getElementById("arraySizeValue");
const speedValue = document.getElementById("speedValue");
const algoSelect = document.getElementById("algorithm");

// ==== STATE ====
let arr = [];
let arraySize = Number(sizeSlider.value) || 20;
let running = false;
let paused = false;
let delay = computeDelay(Number(speedSlider.value));

// ==== UI: sliders ====
sizeSlider.addEventListener("input", e => {
  arraySize = Number(e.target.value);
  sizeValue.textContent = arraySize;
});

speedSlider.addEventListener("input", e => {
  const val = Number(e.target.value);      // 1..50
  delay = computeDelay(val);               // higher = faster (smaller delay)
  speedValue.textContent = val;            // show slider value directly
  // no need to restart anything; delay is read before each sleep
});

// Delay mapping: 1..50  ->  ~820ms .. ~40ms
function computeDelay(val){
  const d = Math.max(40, Math.round(850 - val * 16));
  return d;
}

let originalArray = []; // will store a copy of the generated array

// ==== Generate / Reset ====
generateBtn.addEventListener("click", () => {
  const userText = userArrayInput.value.trim();
  if (userText) {
    const parsed = userText
      .split(",")
      .map(s => Number(s.trim()))
      .filter(n => Number.isFinite(n));
    arr = parsed.length ? parsed : randomArray(arraySize);
  } else {
    arr = randomArray(arraySize);
  }

  // Save a copy for reset
  originalArray = [...arr];

  render();
});


resetBtn.addEventListener("click", () => {
  if (originalArray.length) {
    arr = [...originalArray]; // restore original
    render();
  } else {
    // fallback if user never generated before
    arr = randomArray(arraySize);
    originalArray = [...arr];
    render();
  }
});



// ==== Start / Pause ====
startBtn.addEventListener("click", async () => {
  if (!arr.length || running) return;
  running = true;
  paused = false;
  pauseBtn.textContent = "Pause";
  startBtn.disabled = true;
  generateBtn.disabled = true;
  sizeSlider.disabled = true;
  algoSelect.disabled = true;

  await runSelectedAlgorithm();

  running = false;
  startBtn.disabled = false;
  generateBtn.disabled = false;
  sizeSlider.disabled = false;
  algoSelect.disabled = false;
});

pauseBtn.addEventListener("click", () => {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
});

// ==== Helpers ====
function randomArray(n){
  return Array.from({length:n}, () => Math.floor(Math.random()*480)+20);
}

function render() {
  container.innerHTML = "";

  // dynamic width so bars always fit nicely
  const gap = 6;
  const innerWidth = Math.max(200, container.clientWidth - 18*2);
  const totalGap = Math.max(0, (arr.length - 1) * gap);
  const w = Math.max(6, Math.floor((innerWidth - totalGap) / Math.max(1, arr.length)));

  const max = Math.max(...arr, 1);
  const maxHeight = container.clientHeight - 30; // keep some headroom for text

  arr.forEach(v => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.width = `${w}px`;
    bar.style.height = `${Math.max(6, Math.round((v/max) * maxHeight))}px`;
    bar.textContent = v;
    container.appendChild(bar);
  });
}

function bars() { return container.getElementsByClassName("bar"); }

function setBar(i, value){
  // update height + text for bar i
  const b = bars()[i];
  if (!b) return;
  b.style.height = value + "px"; // will be re-scaled by render scale if we used raw px
  b.textContent = arr[i];
}

function clearStates(i){
  const b = bars()[i];
  if (!b) return;
  b.classList.remove("compare","swap","pivot");
}

function markCompare(i,j){
  if (bars()[i]) { clearStates(i); bars()[i].classList.add("compare"); }
  if (bars()[j]) { clearStates(j); bars()[j].classList.add("compare"); }
}

function markSwap(i,j){
  if (bars()[i]) { clearStates(i); bars()[i].classList.add("swap"); }
  if (bars()[j]) { clearStates(j); bars()[j].classList.add("swap"); }
}

function markPivot(i){
  if (bars()[i]) { clearStates(i); bars()[i].classList.add("pivot"); }
}

function markSortedRange(l, r){
  for (let i=l; i<=r; i++){
    const b = bars()[i];
    if (b){ b.classList.remove("compare","swap","pivot"); b.classList.add("sorted"); }
  }
}

function clearAllTransientStates(){
  const bs = bars();
  for (let i=0;i<bs.length;i++){
    bs[i].classList.remove("compare","swap","pivot");
  }
}

async function sleep(ms){
  // pause-aware sleep
  while (paused) { await new Promise(r=>setTimeout(r, 80)); }
  return new Promise(r=>setTimeout(r, ms));
}

async function runSelectedAlgorithm(){
  render(); // ensure DOM bars exist
  switch (algoSelect.value) {
    case "bubble":   await bubbleSort(); break;
    case "selection":await selectionSort(); break;
    case "insertion":await insertionSort(); break;
    case "merge":    await mergeSortVisual(); break;
    case "quick":    await quickSortVisual(0, arr.length-1); break;
    default: break;
  }
  // final all green
  const bs = bars();
  for (let i=0;i<bs.length;i++){ bs[i].classList.remove("compare","swap","pivot"); bs[i].classList.add("sorted"); }
}

/* =========================
   Algorithms (visual)
   ========================= */

// Bubble
async function bubbleSort(){
  for (let i=0; i<arr.length-1; i++){
    for (let j=0; j<arr.length-1-i; j++){
      markCompare(j, j+1);
      await sleep(delay);
      if (arr[j] > arr[j+1]){
        markSwap(j, j+1);
        await sleep(delay);
        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
        // re-render only these two
        render();
      }
      clearAllTransientStates();
    }
    // mark the last element of this pass as sorted
    const idx = arr.length-1-i;
    const b = bars()[idx];
    if (b){ b.classList.add("sorted"); }
  }
}

// Selection
async function selectionSort(){
  for (let i=0; i<arr.length; i++){
    let min = i;
    for (let j=i+1; j<arr.length; j++){
      markCompare(min, j);
      await sleep(delay);
      if (arr[j] < arr[min]) min = j;
      clearAllTransientStates();
    }
    if (min !== i){
      markSwap(i, min);
      await sleep(delay);
      [arr[i], arr[min]] = [arr[min], arr[i]];
      render();
      clearAllTransientStates();
    }
    const b = bars()[i];
    if (b){ b.classList.add("sorted"); }
  }
}

// Insertion
async function insertionSort(){
  for (let i=1; i<arr.length; i++){
    let key = arr[i];
    let j = i-1;
    markCompare(i, j);
    await sleep(delay);
    while (j >= 0 && arr[j] > key){
      markSwap(j, j+1);
      await sleep(delay);
      arr[j+1] = arr[j];
      j--;
      render();
      clearAllTransientStates();
    }
    arr[j+1] = key;
    render();
  }
}

// Merge (top-down, writebacks visualized)
async function mergeSortVisual(){
  async function merge(l,m,r){
    const left = arr.slice(l, m+1);
    const right = arr.slice(m+1, r+1);
    let i=0, j=0, k=l;

    while (i<left.length && j<right.length){
      markCompare(l+i, m+1+j);
      await sleep(delay);
      if (left[i] <= right[j]){
        arr[k] = left[i]; i++;
      } else {
        arr[k] = right[j]; j++;
      }
      render();
      k++;
      clearAllTransientStates();
    }
    while (i<left.length){
      arr[k++] = left[i++];
      render();
      await sleep(delay/1.5);
    }
    while (j<right.length){
      arr[k++] = right[j++];
      render();
      await sleep(delay/1.5);
    }
    markSortedRange(l, r);
  }

  async function ms(l,r){
    if (l>=r) return;
    const m = Math.floor((l+r)/2);
    await ms(l,m);
    await ms(m+1,r);
    await merge(l,m,r);
  }

  await ms(0, arr.length-1);
}

// Quick
async function quickSortVisual(lo, hi){
  if (lo >= hi) {
    if (lo === hi) markSortedRange(lo, hi);
    return;
  }

  async function partition(l, h){
    const pivotVal = arr[h];
    markPivot(h);
    let i = l - 1;

    for (let j=l; j<h; j++){
      markCompare(j, h);
      await sleep(delay);
      if (arr[j] < pivotVal){
        i++;
        markSwap(i, j);
        await sleep(delay);
        [arr[i], arr[j]] = [arr[j], arr[i]];
        render();
      }
      clearAllTransientStates();
      markPivot(h);
    }
    // place pivot
    markSwap(i+1, h);
    await sleep(delay);
    [arr[i+1], arr[h]] = [arr[h], arr[i+1]];
    render();
    clearAllTransientStates();
    const b = bars()[i+1];
    if (b) b.classList.add("sorted");
    return i+1;
  }

  const p = await partition(lo, hi);
  await quickSortVisual(lo, p-1);
  await quickSortVisual(p+1, hi);
}

// ==== Initial ====
arr = randomArray(arraySize);
render();
window.addEventListener("resize", () => render());
