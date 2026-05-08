import CustomEventRequestForm from '../components/CustomEventRequestForm';

export default function CustomEventRequestPage() {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">🎬 Custom Event Build Request</h1>
        <p className="page-subtitle">
          Request a custom event slot built around your creative vision. Our team will review your request and reach out within 48 hours.
        </p>
      </div>
      <CustomEventRequestForm />
    </div>
  );
}
