# ARISE Simulations

Some nursing simulation scenarios in this repository are adapted from **ARISE Simulations**, published by WisTech Open / Open RN:

https://www.wistechopen.org/arise-simulations

## Background

ARISE was a legacy project that produced high-fidelity simulation plans (and related media) for nursing education. The original ARISE app is no longer supported, so QR codes and app-dependent features from the source materials are not functional. The simulation plans themselves remain available for adaptation in high- or low-fidelity simulation and for EHR case-study use in ProChart.

## License

ARISE simulation scenario plans are licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Adaptations must include an attribution statement consistent with that license.

## Difficulty levels

ARISE scenarios use four levels:

| Level | Focus |
| ----- | ----- |
| 1 | Basic assessment & basic intervention |
| 2 | Focused assessment & complex interventions |
| 3 | Identification of complications & prompt interventions |
| 4 | Crisis identification & intervention |

## Simulations in this repository

| ARISE scenario | Level | Local source PDF | Built-in template id |
| -------------- | ----- | ---------------- | -------------------- |
| Female Atypical Chest Pain | 4 | [`Atypical-Chest-Pain-Female_Simulation_Nursing_L4.pdf`](./Atypical-Chest-Pain-Female_Simulation_Nursing_L4.pdf) | `atypical_chest_pain_female_v1` |

**Female Atypical Chest Pain — Level 4:** Post-PCI care. Students provide post-procedural care after cardiac angioplasty, develop discharge teaching after STEMI with PCI, recognize and respond to abnormal findings (including decreased perfusion of the leg), communicate therapeutically in a critical situation, and report pertinent information to the health care team.

Implementation files:

- Template data: [`lib/simulations/atypical-chest-pain-female.generated.json`](../lib/simulations/atypical-chest-pain-female.generated.json)
- Catalog entry: [`lib/simulations/constants.ts`](../lib/simulations/constants.ts)

## Suggested attribution

When documenting or redistributing adaptations of these materials, use an attribution along these lines:

> Adapted from ARISE Simulations / Open RN (WisTech Open), Wisconsin Technical College System TAACCCT IV Consortium, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source: https://www.wistechopen.org/arise-simulations
