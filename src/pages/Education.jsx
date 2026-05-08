import CustomEventRequestForm from '../components/CustomEventRequestForm';

export default function EducationPage() {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">🎓 Education</h1>
        <p className="page-subtitle">
          Request an education slot — host a class, workshop, or skill session for the Studio Flow community.
          Studio Flow uses a custom event request system. Creators can request their own
          event slot using the form below.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CustomEventRequestForm />
      </div>
    </div>
  );
}
