import useEnhance from '../hooks/useEnhance';
import ImageDropzone from '../components/enhance/ImageDropzone';
import BeforeAfterComparison from '../components/enhance/BeforeAfterComparison';
import EnhanceToolbar from '../components/enhance/EnhanceToolbar';
import '../styles/enhance.css';

export default function EnhancePage() {
  const { file, preview, resultImage, metadata, loading, error, setFile, enhance, reset } =
    useEnhance();

  return (
    <div className="enhance-page">
      <header className="enhance-page__header">
        <h1 className="enhance-page__title">AI Enhance</h1>
        <p className="enhance-page__subtitle">
          Improve clarity, sharpness, and overall image quality with AI.
        </p>
      </header>

      <EnhanceToolbar
        onEnhance={enhance}
        onReset={reset}
        hasFile={!!file}
        hasResult={!!resultImage}
        loading={loading}
      />

      {error && (
        <div className="enhance-page__error" role="alert">
          <span className="enhance-page__error-icon" aria-hidden="true">⚠</span>
          {error}
        </div>
      )}

      <div className="enhance-page__canvas">
        {!file && !loading && (
          <ImageDropzone onFileSelect={setFile} disabled={loading} />
        )}

        {file && !resultImage && !loading && (
          <div className="enhance-page__preview">
            <img src={preview} alt="Selected original" className="enhance-page__preview-img" />
            <p className="enhance-page__preview-name">{file.name}</p>
          </div>
        )}

        {loading && (
          <div className="enhance-page__loading">
            <div className="enhance-page__spinner" />
            <p className="enhance-page__loading-text">
              Enhancing your image — this may take a moment…
            </p>
          </div>
        )}

        {resultImage && preview && (
          <>
            <BeforeAfterComparison before={preview} after={resultImage} />
            {metadata && (
              <div className="enhance-page__meta">
                <span>Resolution: {metadata.resolution}</span>
                <span>Format: {metadata.format?.toUpperCase()}</span>
                <span>Size: {(metadata.size_bytes / 1024).toFixed(0)} KB</span>
                <span className="enhance-page__meta-saved">✓ Auto-saved to Library</span>
              </div>
            )}
            <div className="enhance-page__actions">
              <a
                href={resultImage}
                download={`enhanced_${file?.name || 'image.png'}`}
                className="btn btn--primary"
              >
                Download Enhanced Image
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
