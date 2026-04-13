# Operation Clean Slate - Duplicate Detection & Merge System

## 🎯 Problem Statement

A financial institution needs to clean up duplicate client records in their database. Each client is uniquely identified by their SSN, but records may contain variations in names, addresses, and contact details. This system detects duplicates, intelligently recommends consolidated records, and provides a review interface for operations staff.

## 🚀 Solution Overview

A complete, production-ready duplicate detection and merge system that:

- **Detects** duplicate groups by SSN (exact + fuzzy matches for typos)
- **Intelligently merges** records using configurable field-level rules
- **Scores confidence** (0-100%) at both field and group levels
- **Provides a modern review interface** with side-by-side comparison
- **Tracks all actions** with complete audit logging
- **Supports undo operations** for misclicks
- **AI-powered chat assistant** for data questions

## ✨ Key Features

### 1. Smart Duplicate Detection
- **Exact SSN matching** for perfect duplicates
- **Fuzzy matching** for SSN typos using name+DOB combination
- Groups identified automatically from JSON input

### 2. Field-Level Merge Rules
Configurable rules for each field:

| Field | Default Rule | Confidence Impact |
|-------|--------------|-------------------|
| `first_name` | Most frequent | 0.20 weight |
| `last_name` | Most frequent | 0.25 weight |
| `date_of_birth` | Most frequent | 0.25 weight |
| `address` | Fuzzy-match + most recent | 0.10 weight |
| `phone_number` | Most frequent | 0.10 weight |
| `email` | Most recent | 0.10 weight |

**Address Fuzzy Matching**: Normalizes address suffixes (Street → St, Avenue → Ave, etc.) before comparison.

### 3. Confidence Scoring System
- **Field-level confidence**: 0-100% based on agreement with canonical value
- **Group-level confidence**: Weighted average of all field scores
- **Outlier detection**: Flags records that deviate significantly
- **Auto-approval ready**: 100% confidence groups can be bulk-approved

### 4. Review Interface
- **Side-by-side source records** with diff highlighting
- **Proposed canonical record** with rule labels
- **Per-field confidence badges** (High/Medium/Low)
- **Manual field overrides** via dropdown
- **Batch pagination** for large datasets

### 5. Merge & Purge Execution
- **Canonical record**: Retains oldest `record_id`
- **Duplicate removal**: All non-canonical records are marked for purging
- **Exports**: 
  - `merged_clients.json` - Cleaned dataset
  - `duplicates_removed.json` - Purged records
  - `audit_log.json` - Complete decision history

### 6. Audit Log
Records for every merge decision:
- Timestamp and masked SSN
- Canonical and retired record IDs
- Group confidence score
- Field-level decisions with rules used
- Individual record confidence scores

### 7. Undo Functionality
- **Single-action undo**: Revert individual approvals/rejections
- **Batch undo**: Revert "Approve All 100%" operations
- **Audit log undo buttons**: Undo from history view
- **Action history**: Last 50 actions stored

### 8. AI Chat Assistant
- **Anthropic Claude integration** (configurable)
- Answers questions about your data
- Provides duplicate analysis insights

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS (dark mode supported)
- **Drag & Drop**: react-dropzone
- **Icons**: Lucide React
- **AI Integration**: Anthropic Claude API

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/operation-clean-slate.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎮 Usage Guide

### 1. Upload Data
- Drag & drop a JSON file or click to upload
- Expected format: Array of client records
- Minimum required fields: `ssn`, `record_id` (or `id`)

### 2. Configure Rules (Optional)
- Click **Field Rule Configuration** to expand
- Adjust field weights (0-1, sum automatically normalized)
- Change selection rules per field
- Custom rules are visually highlighted

### 3. Review Duplicate Groups
- Groups appear in batches (3 per batch default)
- Each group shows:
  - Source records table with diff highlighting
  - Proposed canonical record
  - Confidence badges (color-coded)
  - Outlier warnings

### 4. Make Decisions
- **Approve Merge**: Accept the proposed canonical record
- **Reject**: Skip this duplicate group
- **Override Fields**: Select alternative values from dropdowns
- **Approve All 100%**: Batch approve all perfect-confidence groups

### 5. Undo Mistakes
- Click **Undo last action** button in controls
- Or undo individual actions from Audit Log

### 6. Export Results
- Switch to **Audit Log** tab
- Click **Export all 3 files** to download:
  - Merged clients
  - Duplicates removed
  - Complete audit log

## 📊 Input/Output Examples

### Input Format
```json
[
  {
    "record_id": "REC-1001",
    "ssn": "123-45-6789",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1985-03-22",
    "address": "123 Main St, New York, NY 10001",
    "phone_number": "+1-212-555-0100",
    "email": "john.doe@example.com",
    "created_at": "2019-04-10T08:00:00Z"
  }
]
```

### Output Files

**merged_clients.json**
```json
[
  {
    "record_id": "REC-1001",
    "first_name": "John",
    "last_name": "Doe",
    "ssn": "123-45-6789",
    "date_of_birth": "1985-03-22",
    "address": "123 Main St, New York, NY 10001",
    "phone_number": "+1-212-555-0100",
    "email": "john.doe@example.com"
  }
]
```

**audit_log.json**
```json
[
  {
    "timestamp": "2024-01-15T10:30:00Z",
    "ssn_masked": "***-**-6789",
    "canonical_record_id": "REC-1001",
    "retired_record_ids": ["REC-1042", "REC-1087"],
    "group_avg_confidence": 92,
    "field_decisions": {
      "first_name": {
        "chosen_value": "John",
        "rule": "most_frequent",
        "group_confidence": 92
      }
    }
  }
]
```


## 🔧 Configuration

### Environment Variables
Create `.env.local`:
```env
ANTHROPIC_API_KEY=your_api_key_here
```

### Rule Customization
Modify `DEFAULT_FIELD_RULES` and `DEFAULT_FIELD_WEIGHTS` in `page.tsx`:
```typescript
const DEFAULT_FIELD_WEIGHTS = {
  date_of_birth: 0.25,
  last_name: 0.25,
  first_name: 0.20,
  phone_number: 0.10,
  address: 0.10,
  email: 0.10,
};
```

## 📈 Performance Optimizations

- **Memoized scoring**: `useMemo` for expensive confidence calculations
- **Debounced search**: 300ms delay on search input
- **Pagination**: Batches groups to manage DOM size
- **Lazy expansion**: Canonical details expand only on click

## 🎨 UI Features

- **Dark/Light mode**: Automatic system preference detection
- **Responsive design**: Works on desktop and tablet
- **Visual feedback**: Confidence color coding (green/yellow/red)
- **Diff highlighting**: Changed values shown in red
- **Outlier indicators**: Warning icons for low-confidence records
- **Custom rule highlighting**: Purple borders for non-default configs

## 🔒 Security Considerations

- **SSN masking**: Display shows only last 4 digits
- **Client-side processing**: No data sent to servers (except optional AI)
- **Audit trail**: All decisions recorded immutably

## 🚧 Future Enhancements

- [ ] AI-powered fuzzy matching beyond SSN
- [ ] Data quality reports with metrics
- [ ] Bulk approval for low-risk groups
- [ ] Custom rule templates
- [ ] Export to CSV/Excel
- [ ] Multi-user workflow with roles
- [ ] API endpoints for automation
- [ ] Database persistence layer

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request


**Problem Statement**: Operation Clean Slate - Duplicate Client Detection & Merge System

**Key Differentiators**:
- Configurable field-level rule engine
- AI confidence scoring (field + group level)
- Complete undo/redo system
- Production-ready UI with dark mode
- Comprehensive audit logging
- Real-time rule configuration without reload

## 🙏 Acknowledgments

- Anthropic for Claude API
- Tailwind CSS for styling
- React community for excellent tooling

---

## Quick Start Commands

```bash
# One-command setup
npm install && npm run dev

# Open browser to http://localhost:3000
# Upload sample data and start merging!
```
