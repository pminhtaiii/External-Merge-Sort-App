# External Merge Sort Visualizer

A web application built to visualize how the **External Merge Sort** algorithm works.

## When to use External Merge Sort?

External sorting is required when the data being sorted do not fit into the main memory of a computing device (usually RAM) and instead they must reside in the slower external memory (usually a hard drive)

## Features

- **Data Generator:** Generate random `.bin` files of any size (from a few KBs to GBs) containing 8-byte floating-point numbers for testing.
- **Sorting Engine:** A Python backend that handles the actual file chunking, out-of-core sorting, and merging.
- **Step-by-step Visualization:** 
  - Watch the exact process of how files are split and merged.
  - Set a custom "RAM size" (chunk size) to see how the algorithm adapts to limited memory.
  - Controls: Play, Pause, Rewind, and adjust the sorting speed.

## Tech Stack

- **Backend:** Python, FastAPI
- **Frontend:** HTML, Vanilla JavaScript, Tailwind CSS

## Project Structure

```text
/
├── backend/                  # Python & FastAPI Server
│   ├── main.py               # Application entry point
│   ├── router.py             # API routes and endpoints
│   ├── externalMergeSort.py  # Core sorting algorithm & Min-Heap logic
│   └── createTestFile.py     # Data generator utility
│
├── frontend/                 # Client-side UI
│   ├── index.html            # Main user interface
│   └── script.js             # UI logic and API calls
│
├── requirements.txt          # Python dependencies
├── .gitignore                # Ignored files (temporary data, caches)
└── README.md                 # Project documentation




