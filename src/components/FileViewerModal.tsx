import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Image from 'next/image';

interface FileRecord {
  id: string;
  url: string;
  type: string;
  createdAt: Date;
}

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileRecord[];
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  files
}) => {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Files Viewer
                    </Dialog.Title>
                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((file) => (
                          <div
                            key={file.id}
                            className="relative rounded-lg overflow-hidden border border-gray-200"
                          >
                            {file.type.toUpperCase() === 'IMAGE' ? (
                              <div className="aspect-square relative">
                                <Image
                                  src={file.url}
                                  alt="File preview"
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onClick={() => window.open(file.url, '_blank')}
                                  style={{ cursor: 'pointer' }}
                                />
                              </div>
                            ) : (
                              <div className="aspect-square flex items-center justify-center bg-gray-50">
                                <FileText className="h-16 w-16 text-gray-400" />
                              </div>
                            )}
                            <div className="p-2 bg-white border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                                {new Date(file.createdAt).toLocaleDateString()}
                              </p>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Open in new tab
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="mr-2"
                  >
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default FileViewerModal;