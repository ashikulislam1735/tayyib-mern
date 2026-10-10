import { useAuth } from '../context/AuthContext';

// শুধু "মালিক" ভূমিকার জন্য পেজ। স্টাফ এলে বার্তা দেখায় (সার্ভারও আলাদাভাবে আটকায়)।
export default function OwnerOnly({ children }) {
    const { isOwner } = useAuth();
    if (!isOwner) return <p className="status-msg">এই পেজ শুধু মালিকের জন্য।</p>;
    return children;
}
