import { initTheme, toggleTheme } from '../../assets/js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  const typeSelector = document.getElementById('converter-type');
  const inputVal = document.getElementById('input-value');
  const outputVal = document.getElementById('output-value');
  const inputUnit = document.getElementById('input-unit');
  const outputUnit = document.getElementById('output-unit');

  const units = {
    data: {
      'Bytes (B)': 1,
      'Kilobytes (KB)': 1024,
      'Megabytes (MB)': 1024 * 1024,
      'Gigabytes (GB)': 1024 * 1024 * 1024,
      'Terabytes (TB)': 1024 * 1024 * 1024 * 1024
    },
    length: {
      'Millimeters (mm)': 0.001,
      'Centimeters (cm)': 0.01,
      'Meters (m)': 1,
      'Kilometers (km)': 1000,
      'Inches (in)': 0.0254,
      'Feet (ft)': 0.3048,
      'Yards (yd)': 0.9144,
      'Miles (mi)': 1609.34
    },
    temperature: {
      'Celsius (°C)': 'C',
      'Fahrenheit (°F)': 'F',
      'Kelvin (K)': 'K'
    }
  };

  function populateUnits() {
    if (!typeSelector || !inputUnit || !outputUnit) return;
    
    const type = typeSelector.value;
    inputUnit.innerHTML = '';
    outputUnit.innerHTML = '';

    const categoryUnits = units[type];
    Object.keys(categoryUnits).forEach((unitName, index) => {
      const value = categoryUnits[unitName];
      const opt1 = new Option(unitName, value);
      const opt2 = new Option(unitName, value);
      
      inputUnit.add(opt1);
      outputUnit.add(opt2);
      
      if (index === 0) opt1.selected = true;
      if (index === 1 || (index === 0 && Object.keys(categoryUnits).length === 1)) {
        opt2.selected = true;
      }
    });

    calculate();
  }

  function calculate() {
    if (!typeSelector || !inputVal || !outputVal || !inputUnit || !outputUnit) return;

    const type = typeSelector.value;
    const val = parseFloat(inputVal.value);
    if (isNaN(val)) {
      outputVal.value = '';
      return;
    }

    if (type === 'temperature') {
      const from = inputUnit.value;
      const to = outputUnit.value;
      const result = convertTemperature(val, from, to);
      outputVal.value = Number(result.toFixed(4)).toString(); // format cleanly without trailing zeroes
    } else {
      const fromFactor = parseFloat(inputUnit.value);
      const toFactor = parseFloat(outputUnit.value);
      const valueInBase = val * fromFactor;
      const result = valueInBase / toFactor;
      outputVal.value = Number(result.toFixed(8)).toString(); // format cleanly without trailing zeroes
    }
  }

  function convertTemperature(value, from, to) {
    if (from === to) return value;
    let celsius = value;

    // Convert from origin scale to Celsius
    if (from === 'F') {
      celsius = (value - 32) * 5 / 9;
    } else if (from === 'K') {
      celsius = value - 273.15;
    }

    // Convert from Celsius to target scale
    if (to === 'C') {
      return celsius;
    } else if (to === 'F') {
      return (celsius * 9 / 5) + 32;
    } else if (to === 'K') {
      return celsius + 273.15;
    }
    
    return value;
  }

  // Attach event listeners
  if (typeSelector) typeSelector.addEventListener('change', populateUnits);
  if (inputVal) inputVal.addEventListener('input', calculate);
  if (inputUnit) inputUnit.addEventListener('change', calculate);
  if (outputUnit) outputUnit.addEventListener('change', calculate);

  // Initialize/Bootstrap
  populateUnits();
});
