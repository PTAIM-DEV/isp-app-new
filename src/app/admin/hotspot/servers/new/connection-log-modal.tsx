'use client';

import { X, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ConnectionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  success: boolean;
  error?: string;
  serverIdentity?: string;
}

export default function ConnectionLogModal({ isOpen, onClose, logs, success, error, serverIdentity }: ConnectionLogModalProps) {
  const [copied, setCopied] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCopy = () => {
    const logText = logs.join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
          style={{ zIndex: 9998 }}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full" style={{ zIndex: 10000, position: 'relative' }}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {success ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 mr-3" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mr-3" />
                )}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {success ? 'Connection Test Successful' : 'Connection Test Failed'}
                  </h3>
                  {success && (
                    <p className="text-sm text-green-700 mt-1">
                      ✓ Server is ready to use - No issues detected
                    </p>
                  )}
                  {serverIdentity && success && (
                    <p className="text-sm text-green-600 mt-1 font-medium">
                      Server Identity: {serverIdentity}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  title="Copy logs"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Logs
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-sm font-medium text-red-800">Error: {error}</p>
              </div>
            )}
          </div>

          {/* Success message banner */}
          {success && (
            <div className="px-6 py-3 bg-green-100 border-l-4 border-green-500">
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Connection successful! Server is ready to use.
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    All connection tests passed. You can proceed to save this server configuration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Log content */}
          <div className="px-6 py-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Connection Log:</h4>
              {success && (
                <span className="text-xs text-green-600 font-medium">✓ All checks passed</span>
              )}
            </div>
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-green-400 font-mono">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className={log.includes('✗') ? 'text-red-400' : log.includes('✓') ? 'text-green-400' : 'text-gray-300'}>
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No logs available</div>
                )}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

