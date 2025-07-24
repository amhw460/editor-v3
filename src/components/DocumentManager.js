import React, { useState } from 'react';
import styled from 'styled-components';
import { Plus, FileText, Trash2, Edit3, MoreVertical } from 'lucide-react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3367d6;
  }
`;

const DocumentList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
`;

const DocumentItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: ${props => props.isActive ? '#e0b0ff' : 'transparent'};
  border: ${props => props.isActive ? '1px solid #800080' : '1px solid transparent'};

  &:hover {
    background-color: ${props => props.isActive ? '#e8f0fe' : '#f8f9fa'};
  }
`;

const DocumentIcon = styled.div`
  margin-right: 12px;
  color: #5f6368;
`;

const DocumentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DocumentTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DocumentDate = styled.div`
  font-size: 12px;
  color: #5f6368;
`;

const DocumentActions = styled.div`
  position: relative;
  opacity: 0;
  transition: opacity 0.2s;

  ${DocumentItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  padding: 4px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #5f6368;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f1f3f4;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
`;

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  text-align: left;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f8f9fa;
  }

  &:first-child {
    border-radius: 6px 6px 0 0;
  }

  &:last-child {
    border-radius: 0 0 6px 6px;
  }
`;

const RenameInput = styled.input`
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #4285f4;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  background: white;
  outline: none;
`;

function DocumentManager({ 
  documents, 
  currentDocument, 
  onSelectDocument, 
  onCreateDocument, 
  onDeleteDocument, 
  onRenameDocument 
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1 || diffDays === 0) return 'Today';
    else if (diffDays === 2) return 'Yesterday';
    else return `${Math.max(diffDays - 1, 0)} days ago`;
    return date.toLocaleDateString();
  };

  const handleRename = (doc) => {
    setRenamingDoc(doc.id);
    setRenameValue(doc.title);
    setActiveDropdown(null);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (renameValue.trim()) {
      onRenameDocument(renamingDoc, renameValue.trim());
    }
    setRenamingDoc(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenamingDoc(null);
    setRenameValue('');
  };

  const handleDelete = (docId) => {
    onDeleteDocument(docId);
    setActiveDropdown(null);
  };

  return (
    <Container>
      <Header>
        <Title>Documents</Title>
        <CreateButton onClick={onCreateDocument}>
          <Plus size={16} />
          New Document
        </CreateButton>
      </Header>
      
      <DocumentList>
        {documents.map(doc => (
          <DocumentItem
            key={doc.id}
            isActive={currentDocument?.id === doc.id}
            onClick={() => onSelectDocument(doc)}
          >
            <DocumentIcon>
              <FileText size={16} />
            </DocumentIcon>
            
            <DocumentInfo>
              {renamingDoc === doc.id ? (
                <form onSubmit={handleRenameSubmit}>
                  <RenameInput
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameCancel}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleRenameCancel();
                    }}
                    autoFocus
                  />
                </form>
              ) : (
                <>
                  <DocumentTitle>{doc.title}</DocumentTitle>
                  <DocumentDate>{formatDate(doc.updatedAt)}</DocumentDate>
                </>
              )}
            </DocumentInfo>
            
            <DocumentActions>
              <ActionButton
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === doc.id ? null : doc.id);
                }}
              >
                <MoreVertical size={16} />
              </ActionButton>
              
              {activeDropdown === doc.id && (
                <DropdownMenu>
                  <DropdownItem onClick={() => handleRename(doc)}>
                    <Edit3 size={14} />
                    Rename
                  </DropdownItem>
                  <DropdownItem onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={14} />
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              )}
            </DocumentActions>
          </DocumentItem>
        ))}
      </DocumentList>
    </Container>
  );
}

export default DocumentManager; 