import React from 'react';
import ComingSoonModal from './ComingSoonModal';

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
}

const WithdrawModal = ({ visible, onClose }: WithdrawModalProps) => {
  return (
    <ComingSoonModal
      visible={visible}
      onClose={onClose}
      title="Withdrawals Coming Soon"
      message="Withdrawals are not available yet. We're working on it."
    />
  );
};

export default WithdrawModal;
