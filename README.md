Electronic Health Record (EHR) simulation software for nursing education.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Transcript → assessment fill (TypeSafe)

Copy `.env.example` to `.env.local` and set `TYPESAFE_API_KEY` from [console.typesafe.ai](https://console.typesafe.ai). Without it, applying a transcript on the assessment page will fail.

## License

Copyright (c) 2026 contributors to ProChart.

This program is free software: you can redistribute it and/or modify it under the terms of the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html) as published by the Free Software Foundation, version 3 of the License. See the [full license text](LICENSE).
