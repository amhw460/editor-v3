import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import DocumentManager from './components/DocumentManager';
import TextEditor from './components/TextEditor';
import Toolbar from './components/Toolbar';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #f8f9fa;
`;

const Sidebar = styled.div`
  width: 300px;
  background-color: white;
  border-right: 1px solid #e1e5e9;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const EditorContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
`;

const EditorWrapper = styled.div`
  width: 100%;
  background-color: transparent;
  overflow: hidden;
  height: 100%;
`;

function App() {
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [editor, setEditor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load documents from localStorage on mount
  useEffect(() => {
    setIsLoading(true);
    
    const initializeDocuments = () => {
      try {
        const savedDocs = localStorage.getItem('text-editor-documents');
        
        if (savedDocs) {
          const parsedDocs = JSON.parse(savedDocs);
          console.log('App: Loaded documents from localStorage:', parsedDocs);
          console.log('App: First document content:', parsedDocs[0]?.content);
          setDocuments(parsedDocs);
          if (parsedDocs.length > 0) {
            setCurrentDocument(parsedDocs[0]);
          }
        } else {
          // Create a default document as fallback
          const defaultDoc = {
            id: Date.now().toString(),
            title: 'Untitled Document',
            content: '<p>Start typing here...</p>',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setDocuments([defaultDoc]);
          setCurrentDocument(defaultDoc);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
        // Create a default document as fallback
        const defaultDoc = {
          id: Date.now().toString(),
          title: 'Untitled Document',
          content: '<p>Start typing here...</p>',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setDocuments([defaultDoc]);
        setCurrentDocument(defaultDoc);
      } finally {
        setIsLoading(false);
      }
    };

    setTimeout(initializeDocuments, 0);
  }, []);

  // Save documents to localStorage whenever documents change (debounced)
  useEffect(() => {
    if (documents.length > 0) {
      const timeoutId = setTimeout(() => {
        console.log('App: Saving documents to localStorage:', documents);
        localStorage.setItem('text-editor-documents', JSON.stringify(documents));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [documents]);

  // Memoize callbacks to prevent unnecessary re-renders
  const createDocument = useCallback(() => {
    const newDoc = {
      id: Date.now().toString(),
      title: 'Untitled Document',
      content: '<p></p>',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDocuments(prev => [newDoc, ...prev]);
    setCurrentDocument(newDoc);
  }, []);

  const deleteDocument = useCallback((docId) => {
    setDocuments(prev => {
      const filtered = prev.filter(doc => doc.id !== docId);
      if (currentDocument?.id === docId) {
        setCurrentDocument(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
  }, [currentDocument?.id]);

  const renameDocument = useCallback((docId, newTitle) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, title: newTitle, updatedAt: new Date().toISOString() }
        : doc
    ));
    if (currentDocument?.id === docId) {
      setCurrentDocument(prev => ({ ...prev, title: newTitle }));
    }
  }, [currentDocument?.id]);

  const updateDocumentContent = useCallback((content) => {
    if (!currentDocument) return;
    
    const updatedDoc = {
      ...currentDocument,
      content,
      updatedAt: new Date().toISOString()
    };
    
    console.log('App: Updating document content:', content);
    setCurrentDocument(updatedDoc);
    setDocuments(prev => prev.map(doc => 
      doc.id === currentDocument.id ? updatedDoc : doc
    ));
  }, [currentDocument]);

  // Memoize the loading screen to prevent unnecessary re-renders
  const loadingScreen = useMemo(() => (
    <AppContainer>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#5f6368'
      }}>
        Loading...
      </div>
    </AppContainer>
  ), []);

  // Memoize the no document screen
  const noDocumentScreen = useMemo(() => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%',
      fontSize: '16px',
      color: '#5f6368'
    }}>
      No document selected. Create a new document to get started.
    </div>
  ), []);

  if (isLoading) {
    return loadingScreen;
  }

  return (
    <AppContainer>
      <Sidebar>
        <DocumentManager
          documents={documents}
          currentDocument={currentDocument}
          onSelectDocument={setCurrentDocument}
          onCreateDocument={createDocument}
          onDeleteDocument={deleteDocument}
          onRenameDocument={renameDocument}
        />
      </Sidebar>
      <MainContent>
        {currentDocument ? (
          <>
            <Toolbar editor={editor} documentTitle={currentDocument.title} />
            <EditorContainer>
              <EditorWrapper>
                <TextEditor
                  document={currentDocument}
                  onContentChange={updateDocumentContent}
                  onEditorReady={setEditor}
                />
              </EditorWrapper>
            </EditorContainer>
          </>
        ) : noDocumentScreen}
      </MainContent>
    </AppContainer>
  );
}

export default App; 