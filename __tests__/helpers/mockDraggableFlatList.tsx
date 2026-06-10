import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

type MockDraggableFlatListOptions = {
  testID?: string;
  autoDragOnMount?: boolean;
};

type MockDraggableFlatListProps<T> = {
  data: T[];
  renderItem: (params: {
    item: T;
    index: number;
    drag: () => void;
    isActive: boolean;
    getIndex: () => number;
  }) => React.ReactNode;
  onDragEnd?: (params: { data: T[] }) => void;
  ListHeaderComponent?: React.ReactNode | (() => React.ReactNode);
  ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const renderSlot = (slot?: React.ReactNode | (() => React.ReactNode)) => {
  if (!slot) {
    return null;
  }

  return typeof slot === "function" ? slot() : slot;
};

export const createMockDraggableFlatList = ({
  testID,
  autoDragOnMount = false,
}: MockDraggableFlatListOptions = {}) => {
  const MockFlatList = <T,>({
    data,
    renderItem,
    onDragEnd,
    ListHeaderComponent,
    ListEmptyComponent,
    contentContainerStyle,
  }: MockDraggableFlatListProps<T>) => {
    const firedRef = React.useRef(false);

    React.useEffect(() => {
      if (!autoDragOnMount || firedRef.current || data.length === 0 || !onDragEnd) {
        return;
      }

      firedRef.current = true;
      onDragEnd({ data: [...data].reverse() });
    }, [autoDragOnMount, data, onDragEnd]);

    const content = (
      <>
        {renderSlot(ListHeaderComponent)}
        {data.length === 0 ? renderSlot(ListEmptyComponent) : null}
        {data.map((item, index) => (
          <React.Fragment key={String((item as { id?: string }).id ?? index)}>
            {renderItem({
              item,
              index,
              drag: () => {},
              isActive: false,
              getIndex: () => index,
            })}
          </React.Fragment>
        ))}
      </>
    );

    if (!testID && !contentContainerStyle) {
      return content;
    }

    return (
      <View testID={testID} style={contentContainerStyle}>
        {content}
      </View>
    );
  };

  MockFlatList.displayName = "MockDraggableFlatList";
  return MockFlatList;
};
