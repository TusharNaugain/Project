import React, { useState, useCallback } from 'react';
import { Upload, Image, Zap, AlertCircle, CheckCircle, Eye, FileText, Monitor, Palette, Move, ChevronDown, ChevronUp } from 'lucide-react';

interface ImageMetadata {
  filename: string;
  originalName: string;
  fileSize: number;
  fileSizeFormatted: string;
  dimensions: { width: number; height: number };
  format: string;
  channels: number;
  density?: number;
  hasAlpha: boolean;
  colorSpace: string;
}

interface ColorChange {
  position: { x: number; y: number };
  region: string;
  changeType: string;
  beforeColor: { r: number; g: number; b: number };
  afterColor: { r: number; g: number; b: number };
  intensity: number;
}

interface StructuralChange {
  position: { x: number; y: number };
  region: string;
  changeType: string;
  edgesBefore: number;
  edgesAfter: number;
  intensity: number;
}

interface PositionalChange {
  position: { x: number; y: number };
  changeType: string;
  affectedArea: string;
  changeDetails: string;
  intensity: number;
}

interface ComparisonResult {
  similarity: number;
  totalPixels: number;
  differentPixels: number;
  diffImagePath: string;
  dimensions: { width: number; height: number };
  metadata: {
    image1: ImageMetadata;
    image2: ImageMetadata;
  };
  analysis: {
    identical: boolean;
    highSimilarity: boolean;
    moderateSimilarity: boolean;
    lowSimilarity: boolean;
  };
  detailedAnalysis: {
    colorChanges: ColorChange[];
    structuralChanges: StructuralChange[];
    positionalChanges: PositionalChange[];
    summary: string;
  };
  uploadedImages: {
    image1: string;
    image2: string;
  };
}

function App() {
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [image1Preview, setImage1Preview] = useState<string>('');
  const [image2Preview, setImage2Preview] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string>('');
  const [showDetailedView, setShowDetailedView] = useState(false);

  const handleFileSelect = useCallback((file: File, imageNumber: 1 | 2) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        if (imageNumber === 1) {
          setImage1(file);
          setImage1Preview(preview);
        } else {
          setImage2(file);
          setImage2Preview(preview);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, imageNumber: 1 | 2) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file, imageNumber);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const compareImages = async () => {
    if (!image1 || !image2) {
      setError('Please select both images to compare');
      return;
    }

    setIsComparing(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image1', image1);
      formData.append('image2', image2);

      const response = await fetch('/api/compare', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || 'Comparison failed');
      }
    } catch (err) {
      setError('Failed to compare images. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsComparing(false);
    }
  };

  const resetComparison = () => {
    setImage1(null);
    setImage2(null);
    setImage1Preview('');
    setImage2Preview('');
    setResult(null);
    setError('');
    setShowDetailedView(false);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 95) return 'text-green-600';
    if (similarity >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatColor = (color: { r: number; g: number; b: number }) => {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Eye className="w-10 h-10 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Image Comparison Tool</h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload two images to detect and analyze visual differences with precision. 
            Perfect for comparing logos, designs, or any visual content.
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Image 1 Upload */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                <Image className="w-5 h-5 mr-2" />
                First Image
              </h3>
              <div
                className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm"
                onDrop={(e) => handleDrop(e, 1)}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file1')?.click()}
              >
                <input
                  id="file1"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 1)}
                />
                {image1Preview ? (
                  <div className="space-y-4">
                    <img
                      src={image1Preview}
                      alt="First image preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-gray-600">{image1?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">Upload first image</p>
                      <p className="text-sm text-gray-500">Drag and drop or click to select</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Image 2 Upload */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                <Image className="w-5 h-5 mr-2" />
                Second Image
              </h3>
              <div
                className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm"
                onDrop={(e) => handleDrop(e, 2)}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file2')?.click()}
              >
                <input
                  id="file2"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 2)}
                />
                {image2Preview ? (
                  <div className="space-y-4">
                    <img
                      src={image2Preview}
                      alt="Second image preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-gray-600">{image2?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">Upload second image</p>
                      <p className="text-sm text-gray-500">Drag and drop or click to select</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={compareImages}
              disabled={!image1 || !image2 || isComparing}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium shadow-lg"
            >
              {isComparing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Comparing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Compare Images
                </>
              )}
            </button>
            <button
              onClick={resetComparison}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Reset
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Basic Summary View */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Comparison Summary</h3>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-green-700 font-medium">Analysis Complete</span>
                  </div>
                </div>
                
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Similarity Score */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600 font-medium">Similarity Score</span>
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className={`text-3xl font-bold ${getSimilarityColor(result.similarity)}`}>
                      {result.similarity}%
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {result.analysis.identical ? 'Images are identical' :
                       result.analysis.highSimilarity ? 'Very similar images' :
                       result.analysis.moderateSimilarity ? 'Moderately similar' :
                       'Significant differences detected'}
                    </p>
                  </div>

                  {/* Image 1 Metadata */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600 font-medium">First Image</span>
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium truncate ml-2" title={result.metadata.image1.originalName}>
                          {result.metadata.image1.originalName.length > 15 
                            ? result.metadata.image1.originalName.substring(0, 15) + '...'
                            : result.metadata.image1.originalName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium">{result.metadata.image1.fileSizeFormatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-medium">
                          {result.metadata.image1.dimensions.width} × {result.metadata.image1.dimensions.height}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Format:</span>
                        <span className="font-medium uppercase">{result.metadata.image1.format}</span>
                      </div>
                    </div>
                  </div>

                  {/* Image 2 Metadata */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600 font-medium">Second Image</span>
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium truncate ml-2" title={result.metadata.image2.originalName}>
                          {result.metadata.image2.originalName.length > 15 
                            ? result.metadata.image2.originalName.substring(0, 15) + '...'
                            : result.metadata.image2.originalName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium">{result.metadata.image2.fileSizeFormatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-medium">
                          {result.metadata.image2.dimensions.width} × {result.metadata.image2.dimensions.height}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Format:</span>
                        <span className="font-medium uppercase">{result.metadata.image2.format}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-800">{result.totalPixels.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Pixels</div>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{result.differentPixels.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Different Pixels</div>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{result.dimensions.width} × {result.dimensions.height}</div>
                    <div className="text-sm text-gray-600">Comparison Size</div>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.detailedAnalysis.colorChanges.length + 
                       result.detailedAnalysis.structuralChanges.length + 
                       result.detailedAnalysis.positionalChanges.length}
                    </div>
                    <div className="text-sm text-gray-600">Changes Detected</div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Analysis Summary:</h4>
                  <p className="text-gray-600">{result.detailedAnalysis.summary}</p>
                </div>

                {/* Toggle Detailed View */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowDetailedView(!showDetailedView)}
                    className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {showDetailedView ? (
                      <>
                        <ChevronUp className="w-5 h-5" />
                        Hide Detailed Analysis
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-5 h-5" />
                        Show Detailed Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Detailed View */}
              {showDetailedView && (
                <>
                  {/* Visual Comparison */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                      <Monitor className="w-6 h-6 mr-2" />
                      Visual Comparison
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <h4 className="font-medium text-gray-700 mb-3">Original Image 1</h4>
                        <img
                          src={`/api/images/${result.uploadedImages.image1}`}
                          alt="Original 1"
                          className="w-full rounded-lg shadow-md"
                        />
                      </div>
                      <div className="text-center">
                        <h4 className="font-medium text-gray-700 mb-3">Original Image 2</h4>
                        <img
                          src={`/api/images/${result.uploadedImages.image2}`}
                          alt="Original 2"
                          className="w-full rounded-lg shadow-md"
                        />
                      </div>
                      <div className="text-center">
                        <h4 className="font-medium text-gray-700 mb-3">Difference Map</h4>
                        <img
                          src={`/api/images/${result.diffImagePath}`}
                          alt="Differences"
                          className="w-full rounded-lg shadow-md"
                        />
                        <p className="text-sm text-gray-600 mt-2">Red areas show differences</p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Color Changes */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Palette className="w-5 h-5 mr-2" />
                        Color Changes ({result.detailedAnalysis.colorChanges.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {result.detailedAnalysis.colorChanges.length > 0 ? (
                          result.detailedAnalysis.colorChanges.map((change, index) => (
                            <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-orange-800">{change.changeType}</span>
                                <span className="text-xs text-gray-600">Region {change.region}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: formatColor(change.beforeColor) }}
                                  ></div>
                                  <span>Before</span>
                                </div>
                                <span>→</span>
                                <div className="flex items-center gap-1">
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: formatColor(change.afterColor) }}
                                  ></div>
                                  <span>After</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No color changes detected</p>
                        )}
                      </div>
                    </div>

                    {/* Structural Changes */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Monitor className="w-5 h-5 mr-2" />
                        Shape Changes ({result.detailedAnalysis.structuralChanges.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {result.detailedAnalysis.structuralChanges.length > 0 ? (
                          result.detailedAnalysis.structuralChanges.map((change, index) => (
                            <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-800">{change.changeType}</span>
                                <span className="text-xs text-gray-600">Region {change.region}</span>
                              </div>
                              <div className="text-xs text-gray-600">
                                Edges: {change.edgesBefore} → {change.edgesAfter}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No structural changes detected</p>
                        )}
                      </div>
                    </div>

                    {/* Positional Changes */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Move className="w-5 h-5 mr-2" />
                        Position Changes ({result.detailedAnalysis.positionalChanges.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {result.detailedAnalysis.positionalChanges.length > 0 ? (
                          result.detailedAnalysis.positionalChanges.map((change, index) => (
                            <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-800">{change.changeType}</span>
                                <span className="text-xs text-gray-600">({change.affectedArea})</span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {change.changeDetails}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No positional changes detected</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;